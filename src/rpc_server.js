#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var fs = require('fs');
var zip = new require('node-zip')();
var path = require('path');

amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'High';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de alta prioridad');
    ch.consume(q, function reply(msg) {
      console.log(' [x] Archivo de alta prioridad obtenido');
      zip.file("file.txt",msg.content);
      var data = zip.generate({ base64:false, compression: 'DEFLATE' });
      // it's important to use *binary* encode
      fs.writeFileSync('file_compressed.zip', data, 'binary');
      /*var zipFilePath=''+path.join(__dirname, 'file_compressed.zip');
      var bufferArchZip=fs.readFileSync(zipFilePath);
      console.log(bufferArchZip);*/
      var r = "Archivo de alta prioridad comprimido con éxito";
      ch.sendToQueue(msg.properties.replyTo,
        new Buffer(r.toString()),
        {correlationId: msg.properties.correlationId});
      ch.ack(msg);
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Low';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de baja prioridad');
    ch.consume(q, function reply(msg) {
      console.log(' [x] Archivo de baja prioridad obtenido');
      zip.file("file.txt",msg.content);
      var data = zip.generate({ base64:false, compression: 'DEFLATE' });
      // it's important to use *binary* encode
      fs.writeFileSync('file_compressed.zip', data, 'binary');
      /*var zipFilePath=''+path.join(__dirname, 'file_compressed.zip');
      var bufferArchZip=fs.readFileSync(zipFilePath);
      console.log(bufferArchZip);*/
      var r = "Archivo de baja prioridad comprimido con éxito";
      ch.sendToQueue(msg.properties.replyTo,
        new Buffer(r.toString()),
        {correlationId: msg.properties.correlationId});
      ch.ack(msg);
    });
  });
});
