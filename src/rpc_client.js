#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var path = require('path');
var fs = require('fs');
var zip = new require('node-zip')();
var args = process.argv.slice(2);
idDelete="";
idRead="";

corr = generateUuid();
if (args.length === 0) {
  console.log("Usage: rpc_client.js prioridad");
  process.exit(1);
}
queuePriority="Low"
if(args[0]=="delete"){
  queuePriority="High";
  idDelete=args[1];
  mensaje="[x] Enviando archivo a borrar con id: "+idDelete;
}else if(args[0]=="create"){
  queuePriority="Low";
  mensaje='[x] Enviando archivo con id: '+corr;
  //borrado="false";
}else if (args[0]=="read"){
  queuePriority="Normal";
  idRead=args[1];
  mensaje="[x] Enviando archivo a leer con id: "+idRead
}
else{
  console.log("Se equivoco al escribir, intente de nuevo...");
  return;
}

amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    ch.assertQueue('', {exclusive: true}, function(err, q) {
      console.log(mensaje);
      if(queuePriority=="Low"){
        var arch = ''+path.join(__dirname, 'file1.txt');
        var bufferArch=fs.readFileSync(arch);
        ch.consume(q.queue, function(msg) {
          if (msg.properties.correlationId === corr) {
            if(msg.content.toString()==corr){
              console.log("Archivo con id %s no comprimido ",corr);
            }else{
              fs.writeFileSync('file_compressed.zip', msg.content, 'binary');
              console.log(' [.] Archivo con id %s comprimido con éxito',corr);
            }
            setTimeout(function() { conn.close(); process.exit(0) }, 500);
          }
        }, {noAck: true});
        ch.sendToQueue(queuePriority,
          new Buffer(bufferArch),
          { correlationId: corr, replyTo: q.queue});
      }
      else if(queuePriority=="High"){
        ch.consume(q.queue, function(msg) {
          if (msg.properties.correlationId == corr) {
            console.log(msg.content.toString());
            setTimeout(function() { conn.close(); process.exit(0) }, 500);
          }
        }, {noAck: true});
        ch.sendToQueue('High',
        new Buffer(idDelete),
        { correlationId: corr, replyTo: q.queue });
      }
    });
  });
});

function generateUuid() {
  return Math.floor((Math.random() * 9) + 1).toString() +
         Math.floor((Math.random() * 9) + 1).toString() +
         Math.floor((Math.random() * 9) + 1).toString();
}
