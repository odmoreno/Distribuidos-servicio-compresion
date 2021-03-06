#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var fs = require('fs');
var zip = new require('node-zip')();
var path = require('path');
var redis = require('redis');
var client = redis.createClient(10808, 'redis-10808.c10.us-east-1-4.ec2.cloud.redislabs.com');
client.on('connect', function() {
    console.log(' [.] Conectado a REDIS BD');
});
idFile="";
message="";
var cloudinary = require('cloudinary');

var cloudinaryCredentials = {
  cloud_name: 'dsqpicprf',
  api_key:    '259691129854149',
  api_secret: 'jNwDkTwnkXaCzkbdwy6WrqOS8ik'
};

function returnCurrentDate(){
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var h = today.getHours();
  var m= today.getMinutes()
  var yyyy = today.getFullYear();
  if(dd<10){
      dd='0'+dd;
  }
  if(mm<10){
      mm='0'+mm;
  }
  if(m<10){
    m='0'+m;
  }
  return dd+'/'+mm+'/'+yyyy+' '+h+':'+m;
}

cloudinary.config({
  cloud_name: cloudinaryCredentials.cloud_name,
  api_key:    cloudinaryCredentials.api_key,
  api_secret: cloudinaryCredentials.api_secret
});
amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'High';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de alta prioridad');
    ch.consume(q, function reply(msg) {
      console.log(' [.] Archivo a cancelar obtenido');
      idFile = msg.content.toString();
      idClientDelete=msg.properties.correlationId;
      queueDelete=msg.properties.replyTo;
      client.exists(idFile, function(err, reply) {
        if (reply === 1) {
          client.hgetall(idFile, function(err, object) {
            if(object.cancelado=='true'){
              message=" [.] Trabajo ya fue cancelado";
              ch.sendToQueue(queueDelete,
                new Buffer(message),
                {correlationId: idClientDelete});
                ch.ack(msg);
            }
            else{
              message=" [.] Trabajo ya fue comprimido";
              ch.sendToQueue(queueDelete,
                new Buffer(message),
                {correlationId: idClientDelete});
                ch.ack(msg);
            }
          })
        }
        else{
          client.hmset(idFile, {
                'cancelado':true,
                'archivoComprimido': ""+msg.properties.headers.nameFile
            });
          message=" [.] Trabajo cancelado con éxito"
          ch.sendToQueue(queueDelete,
            new Buffer(message),
            {correlationId: idClientDelete});
            ch.ack(msg);
        }
      })
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Low';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de baja prioridad');
    ch.consume(q, function reply(msg) {
      setTimeout(function(){
          client.exists(msg.properties.correlationId, function(err, reply) {
            if (reply === 1) {
              ch.sendToQueue(msg.properties.replyTo,
                new Buffer(msg.properties.correlationId),
                {correlationId: msg.properties.correlationId,});
                ch.ack(msg);
            }
            else{
              console.log(' [.] Archivo a comprimir obtenido');
              zip.file("file.txt",msg.content);
              var data = zip.generate({ base64:false, compression: 'DEFLATE' });
              fileC=fs.writeFileSync('file_compressed.zip',data, 'binary');
                cloudinary.v2.uploader.upload('file_compressed.zip', {resource_type: "raw"},function(error,result){
                  client.hmset(""+msg.properties.correlationId, {
                      'archivoComprimido': ""+msg.properties.headers.nameFile,
                      'fechaDeCreacion':returnCurrentDate(),
                      'link':result.url,
                      'cancelado':false
                  });
                  ch.sendToQueue(msg.properties.replyTo,
                    new Buffer(result.url),
                    {correlationId: msg.properties.correlationId});
                    ch.ack(msg);
                })
            }
          })
      }, 10000);
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Consulta';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de consultas');
    ch.consume(q, function reply(msg) {
        idFile=msg.content.toString();
        console.log(" [.] Archivo con ID: %s a leer obtenido",idFile);
        client.exists(idFile, function(err, reply) {
            if (reply === 1) {
              client.hgetall(idFile, function(err, object) {
                  ch.sendToQueue(msg.properties.replyTo,
                    new Buffer(idFile),
                    {correlationId: msg.properties.correlationId,headers:{resultQuery:object,exist:true}});
                    ch.ack(msg);
              });
            } else {
              ch.sendToQueue(msg.properties.replyTo,
                new Buffer(idFile),
                {correlationId: msg.properties.correlationId,headers:{exist:false}});
                ch.ack(msg);
            }
        });
    });
  });
});
