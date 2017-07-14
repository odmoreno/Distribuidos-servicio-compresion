#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var fs = require('fs');
var zip = new require('node-zip')();

amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'rpc_queue';

    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests');
    ch.consume(q, function reply(msg) {
      console.log(' [x] Archivo obtenido');
      zip.file('file.txt', fs.readFileSync(msg.content.toString()));
      var data = zip.generate({ base64:false, compression: 'DEFLATE' });
      // it's important to use *binary* encode
      fs.writeFileSync(msg.content.toString()+'.zip', data, 'binary');
      var r = "Archivo comprimido con éxito";
      ch.sendToQueue(msg.properties.replyTo,
        new Buffer(r.toString()),
        {correlationId: msg.properties.correlationId});
      ch.ack(msg);
    });
  });
});
