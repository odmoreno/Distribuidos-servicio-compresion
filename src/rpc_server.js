#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var fs = require('fs');
var zip = new require('node-zip')();
var path = require('path');
idFile="";
amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'High';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de alta prioridad');
    ch.consume(q, function reply(msg) {
      console.log(' [x] Archivo a borrar obtenido');
      idFile = msg.content.toString();
      console.log(idFile);
      idClientDelete=msg.properties.correlationId;
      queueDelete=msg.properties.replyTo;
      ch.sendToQueue(queueDelete,
        new Buffer("Archivo borrado exitosamente"),
        {correlationId: idClientDelete});
        ch.ack(msg);
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Low';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de baja prioridad');
    ch.consume(q, function reply(msg) {
      setTimeout(function(){
        if(msg.properties.correlationId==idFile){
          ch.sendToQueue(msg.properties.replyTo,
            new Buffer(idFile),
            {correlationId: msg.properties.correlationId});
            ch.ack(msg);
        }
        else{
          console.log(' [x] Archivo de baja prioridad obtenido');
          zip.file("file.txt",msg.content);
          var data = zip.generate({ base64:false, compression: 'DEFLATE' });
          ch.sendToQueue(msg.properties.replyTo,
            new Buffer(data),
            {correlationId: msg.properties.correlationId});
          ch.ack(msg);
        }
      }, 10000);
    });
  });

});
