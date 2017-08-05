#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var path = require('path');
var fs = require('fs');
var zip = new require('node-zip')();
var args = process.argv.slice(2);
idDelete="";
idRead="";
queuePriority="Low"
corr = generateUuid();

if (args.length === 0) {
  console.log("Usage: rpc_client.js prioridad");
  process.exit(1);
}

if(args[0]=="cancel"){
  queuePriority="High";
  idDelete=args[1];
  mensaje="[x] Enviando archivo a cancelar con id: "+idDelete;
}else if(args[0]=="create"){
  queuePriority="Low";
  mensaje='[x] Enviando archivo con id: '+corr;
  //borrado="false";
}else if (args[0]=="read"){
  queuePriority="Normal";
  idRead=args[1];
  mensaje="[x] Enviando a leer el archivo con id: "+idRead
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
              console.log(" [.] Archivo con ID %s no comprimido ",corr);
            }else{
              console.log(' [.] Archivo con ID %s comprimido con éxito',corr);
              console.log('URL: '+msg.content.toString());
            }
            setTimeout(function() { conn.close(); process.exit(0) }, 500);
          }
        }, {noAck: true});
        ch.sendToQueue(queuePriority,
          new Buffer(bufferArch),
          { correlationId: corr, replyTo: q.queue,headers:{nameFile:"file1.txt"}});
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
        { correlationId: corr, replyTo: q.queue});
      }else{
        ch.consume(q.queue, function(msg) {
          if (msg.properties.correlationId == corr) {
            if(msg.properties.headers.exist){
              console.log(" [.] La información del archivo con ID:"+msg.content.toString()+" es ");
              console.log("Nombre: "+msg.properties.headers.resultQuery.nombre);
              console.log("Fecha de creación: "+msg.properties.headers.resultQuery.fechaDeCreacion);
              console.log("URL: "+msg.properties.headers.resultQuery.link);
              console.log("Cancelado: "+msg.properties.headers.resultQuery.cancelado);
            }
            else{
              console.log("No existe el archivo con ID:"+msg.content.toString());
            }

            setTimeout(function() { conn.close(); process.exit(0) }, 500);
          }
        }, {noAck: true});
        ch.sendToQueue('Consulta',
        new Buffer(idRead),
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
