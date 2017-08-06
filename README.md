# Servicio de compresión en la nube
- Se implementó con la ayuda del middleware RabbitMQ.
- El lenguaje utilizado para el servidor es javascript.
- Los lenguajes utilizados para los clientes son javascript y python

## Requisitos
- Tener instalado python o node.js en la computadora cliente, según el cliente que se use.
- Tener instalado node.js en la computadora servidor.
- Tener una conexión estable a internet.
- Colocar el archivo que se desea comprimir en la carpeta donde se encuentra el cliente.SSSSS

## Ejecución de Clientes

### *Node.js-Javascript*

Para instalar las dependencias que pueda tener el cliente Javascript debe  hacer escribir en la terminal lo siguente:

		npm install

### Create job
Escribir en la terminal:

		node rpc_client.js create

### Read job
Escribir en la terminal:

		node rpc_client.js read <idFile>

### Cancel job
Escribir en la terminal:

		node rpc_client.js cancel <idFile>


### *Python*

Para poder utilizar el cliente Python, primero debe instalar las siguientes dependencias:

		pip install pika
		pip install pyfs

### Create job
Escribir en la terminal:

		python client.py create <filename>

### Read job
Escribir en la terminal:

		python client.py read <idFile>

### Cancel job
Escribir en la terminal:

		python client.py cancel <idFile>

## Ejecución de Servidor

Para instalar las dependencias que pueda tener el servidor Javascript debe  hacer escribir en la terminal lo siguente:

		npm install

### *Node.js-Javascript*
Escribir en la terminal:

		node rpc_server.js
