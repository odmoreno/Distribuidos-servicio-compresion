# Servicio de compresión en la nube
- Se implementó con la ayuda del middleware RabbitMQ.
- El lenguaje utilizado para el servidor es javascript.
- Los lenguajes utilizados para los clientes son javascript y python

## Requisitos
- Tener instalado python y node.js en la computadora cliente.
- Tener instalado node.js en la computadora servidor.
- Tener una conexión estable a internet.

## Ejecución de Clientes

### *Node.js-Javascript*

### Create job
Escribir en la terminal:

		node rpc_client.js create

### Read job
Escribir en la terminal:

		node rpc_client.js read idFile

### Cancel job
Escribir en la terminal:

		node rpc_client.js cancel idFile


### *Python*

### Create job
Escribir en la terminal:

		python client.py create

### Read job
Escribir en la terminal:

		python client.py read idFile

### Cancel job
Escribir en la terminal:

		python client.py cancel idFile

## Ejecución de Servidor

### *Node.js-Javascript*
Escribir en la terminal:

		node rpc_server.js
