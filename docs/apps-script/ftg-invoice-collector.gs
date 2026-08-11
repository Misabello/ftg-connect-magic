/**
 * FTG · Recolector de facturas por correo (Google Apps Script)
 * ------------------------------------------------------------
 * Refactor del script original de recolección de Gmail. Cambios documentados:
 *  1. El script ya NO escribe en la base: sólo envía al endpoint firmado del ERP.
 *  2. No contiene claves de Supabase, de IA ni de facturación. Únicamente el
 *     secreto compartido INGEST_SECRET usado para firmar (HMAC-SHA256).
 *  3. Se agregó LockService para evitar ejecuciones simultáneas.
 *  4. Se procesa en lotes chicos con cursor (última ejecución) y reintentos.
 *  5. El correo se etiqueta "Procesado" sólo tras la confirmación del backend.
 *  6. Los logs nunca incluyen secretos ni el contenido de los documentos.
 *
 * Configuración: Extensiones > Apps Script > Configuración del proyecto >
 * Propiedades del script:
 *   ENDPOINT_URL   https://<tu-app>/api/public/invoices/ingest
 *   INGEST_SECRET  el mismo valor guardado en el ERP
 *   ACCOUNT_EMAIL  casilla registrada en "Casillas de correo"
 *   COUNTRY_CODE   AR | BR | PT (opcional)
 */

var CONFIG = {
  inboxLabel: 'FTG/Facturas',
  processingLabel: 'FTG/Procesando',
  processedLabel: 'FTG/Procesado',
  reviewLabel: 'FTG/Requiere revision',
  errorLabel: 'FTG/Error',
  query: 'has:attachment (subject:factura OR subject:invoice OR subject:fatura OR subject:"nota de credito")',
  batchSize: 5,
  maxAttachmentMb: 15,
  allowedMime: ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png', 'image/webp']
};

function setUpTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processInvoiceEmails').timeBased().everyMinutes(10).create();
}

function label_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function sha256Hex_(bytes) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

function hmacHex_(secret, message) {
  var sig = Utilities.computeHmacSha256Signature(message, secret);
  return sig.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

function processInvoiceEmails() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { Logger.log('Otra ejecución en curso, se omite.'); return; }
  try {
    var props = PropertiesService.getScriptProperties();
    var endpoint = props.getProperty('ENDPOINT_URL');
    var secret = props.getProperty('INGEST_SECRET');
    var accountEmail = props.getProperty('ACCOUNT_EMAIL') || Session.getActiveUser().getEmail();
    var country = props.getProperty('COUNTRY_CODE') || null;
    if (!endpoint || !secret) throw new Error('Faltan ENDPOINT_URL o INGEST_SECRET');

    var processing = label_(CONFIG.processingLabel);
    var processed = label_(CONFIG.processedLabel);
    var review = label_(CONFIG.reviewLabel);
    var errorLabel = label_(CONFIG.errorLabel);

    var query = CONFIG.query + ' -label:"' + CONFIG.processedLabel + '" -label:"' + CONFIG.processingLabel + '"';
    var cursor = props.getProperty('LAST_RUN_AT');
    if (cursor) query += ' after:' + Math.floor(Number(cursor) / 1000);

    var threads = GmailApp.search(query, 0, CONFIG.batchSize);
    Logger.log('Hilos encontrados: ' + threads.length);

    threads.forEach(function (thread) {
      thread.addLabel(processing);
      var handledOk = true;
      var outcome = 'processed';

      thread.getMessages().forEach(function (message) {
        var attachments = [];
        message.getAttachments().forEach(function (att) {
          var mime = att.getContentType();
          if (CONFIG.allowedMime.indexOf(mime) === -1) return;
          if (att.getSize() > CONFIG.maxAttachmentMb * 1024 * 1024) return;
          var bytes = att.getBytes();
          attachments.push({
            filename: att.getName(),
            mimeType: mime,
            size: att.getSize(),
            sha256: sha256Hex_(bytes),
            contentBase64: Utilities.base64Encode(bytes)
          });
        });
        if (attachments.length === 0) return;

        var payload = {
          accountEmail: accountEmail,
          gmailMessageId: message.getId(),
          gmailThreadId: thread.getId(),
          sender: message.getFrom(),
          recipients: String(message.getTo() || '').split(',').map(function (s) { return s.trim(); }).filter(String),
          subject: message.getSubject(),
          receivedAt: message.getDate().toISOString(),
          bodySnippet: message.getPlainBody().slice(0, 2000),
          countryCode: country,
          attachments: attachments
        };

        var body = JSON.stringify(payload);
        var timestamp = String(Math.floor(Date.now() / 1000));
        var requestId = Utilities.getUuid();
        var signature = hmacHex_(secret, timestamp + '.' + requestId + '.' + body);

        var response = null;
        for (var attempt = 1; attempt <= 3; attempt++) {
          response = UrlFetchApp.fetch(endpoint, {
            method: 'post',
            contentType: 'application/json',
            payload: body,
            muteHttpExceptions: true,
            headers: {
              'x-ftg-timestamp': timestamp,
              'x-ftg-request-id': requestId,
              'x-ftg-signature': signature
            }
          });
          if (response.getResponseCode() < 500) break;
          Utilities.sleep(2000 * attempt);
        }

        var code = response ? response.getResponseCode() : 0;
        if (code !== 200) {
          handledOk = false;
          Logger.log('Error de ingesta (' + code + ') mensaje ' + message.getId());
          return;
        }
        var result = JSON.parse(response.getContentText());
        if (result.label === 'error') { handledOk = false; }
        else if (result.label === 'review') { outcome = 'review'; }
      });

      thread.removeLabel(processing);
      if (!handledOk) thread.addLabel(errorLabel);
      else if (outcome === 'review') thread.addLabel(review);
      else thread.addLabel(processed);
    });

    props.setProperty('LAST_RUN_AT', String(Date.now() - 86400000));
  } finally {
    lock.releaseLock();
  }
}