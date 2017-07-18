#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var path = require('path');
var fs = require('fs');
var zip = new require('node-zip')();
var args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: rpc_client.js prioridad");
  process.exit(1);
}
queuePriority="Low"
if(args[0]=="alta"){
  queuePriority="High"
}else{
  queuePriority="Low"
}

amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    ch.assertQueue('', {exclusive: true}, function(err, q) {
      var corr = generateUuid();
      console.log(' [x] Enviando archivo');
      var arch = ''+path.join(__dirname, 'file1.txt');
      var bufferArch=fs.readFileSync(arch);
      ch.consume(q.queue, function(msg) {
        if (msg.properties.correlationId === corr) {
          //fs.rename(""+msg.content,''+path.join(__dirname, 'file1.zip'));
          //se descarga el archivo
          fs.writeFileSync('file_compressed.zip', msg.content, 'binary');
          console.log(' [.] Archivo comprimido con éxito');
          setTimeout(function() { conn.close(); process.exit(0) }, 500);
        }
      }, {noAck: true});
      ch.sendToQueue(queuePriority,
        new Buffer(bufferArch),
        { correlationId: corr, replyTo: q.queue });
    });
  });
});

function generateUuid() {
  return Math.random().toString() +
         Math.random().toString() +
         Math.random().toString();
}
