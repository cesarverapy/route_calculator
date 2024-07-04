// variables globales
var canvas; // referencia al elemento <canvas> en el html para dibujar gráficos
var ctx; // contexto de dibujo del canvas (2d)
var FPS = 50; // cuadros por segundo, define la tasa de refresco de la animación

// configuración del escenario/tablero
var columnas = 25; // número de columnas en la cuadrícula del tablero
var filas = 25; // número de filas en la cuadrícula del tablero
var escenario; // matriz que representa el nivel, o sea un array 2d

// configuración de las celdas establecidas como tiles, por eos la T jeje
var anchoT; // ancho de cada celda en la cuadrícula, calculado en función del canvas
var altoT; // alto de cada celda en la cuadrícula, calculado en función del canvas

// colores para los diferentes tipos de celdas
const muro = '#000000'; // color negro para representar los muros u obstáculos
const vacio = '#777777'; // color gris para representar las celdas transitables
const inicioColor = '#00FF00'; // color verde para la celda de inicio
const finColor = '#FF0000'; // color rojo para la celda de destino

// variables para la búsqueda del camino
var principio; // punto de inicio de la ruta
var fin; // punto de destino de la ruta

var openSet = []; // lista de nodos abiertos (nodos por evaluar)
var closedSet = []; // lista de nodos cerrados (nodos ya evaluados)

var camino = []; // camino encontrado desde el inicio hasta el destino
var terminado = false; // indicador de si la búsqueda ha terminado

var modo = 'inicio'; // modo actual de operación: 'inicio' para establecer el punto de inicio, 'fin' para el punto de destino, y 'obstaculo' para colocar o quitar obstáculos

// función para crear un array 2d
function creaArray2D(f, c) {
  var obj = new Array(f); // crear un array de tamaño 'f' (filas)
  for (a = 0; a < f; a++) {
    obj[a] = new Array(c); // para cada fila, crear un array de tamaño 'c' (columnas)
  }
  return obj; // devolver la matriz 2d
}

// función heurística para estimar la distancia desde un nodo hasta el nodo final
// la heurística utilizada es la distancia manhattan (suma de las diferencias absolutas de las coordenadas)
function heuristica(a, b) {
  var x = Math.abs(a.x - b.x); // diferencia absoluta en la coordenada x entre los nodos 'a' y 'b'
  var y = Math.abs(a.y - b.y); // diferencia absoluta en la coordenada y entre los nodos 'a' y 'b'
  var dist = x + y; // suma de las diferencias absolutas, es decir, la distancia manhattan
  return dist; // devolver la distancia calculada
}

// función para eliminar un elemento de un array
function borraDelArray(array, elemento) {
  // recorrer el array de atrás hacia adelante para evitar problemas al eliminar elementos
  for (i = array.length - 1; i >= 0; i--) {
    if (array[i] == elemento) { // si el elemento actual es igual al que se quiere eliminar
      array.splice(i, 1); // eliminar el elemento del array
    }
  }
}

// constructor para la clase casilla
function Casilla(x, y) {
  this.x = x; // coordenada x de la casilla
  this.y = y; // coordenada y de la casilla
  this.tipo = 0; // tipo de casilla (0: vacía, 1: muro, 2: inicio, 3: fin)
  this.f = 0; // costo total (g + h)
  this.g = 0; // costo desde el inicio hasta esta casilla
  this.h = 0; // heurística (estimación del costo hasta el final)
  this.vecinos = []; // vecinos de la casilla
  this.padre = null; // nodo padre para reconstruir el camino

  // método para agregar los vecinos de la casilla
  this.addVecinos = function () {
    if (this.x > 0)
      this.vecinos.push(escenario[this.y][this.x - 1]); // agregar vecino izquierdo si no está en el borde izquierdo
    if (this.x < filas - 1)
      this.vecinos.push(escenario[this.y][this.x + 1]); // agregar vecino derecho si no está en el borde derecho
    if (this.y > 0)
      this.vecinos.push(escenario[this.y - 1][this.x]); // agregar vecino superior si no está en el borde superior
    if (this.y < columnas - 1)
      this.vecinos.push(escenario[this.y + 1][this.x]); // agregar vecino inferior si no está en el borde inferior
  }

  // método para dibujar la casilla
  this.dibuja = function () {
    var color;
    if (this.tipo == 0)
      color = vacio; // color gris para celdas vacías
    if (this.tipo == 1)
      color = muro; // color negro para muros
    if (this === principio)
      color = inicioColor; // color verde para el punto de inicio
    if (this === fin)
      color = finColor; // color rojo para el punto de destino

    // dibujar el rectángulo en el canvas
    ctx.fillStyle = color; // establecer el color de relleno
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar la casilla en su posición correspondiente
  }

  // método para dibujar las casillas en el openSet (nodos por evaluar)
  this.dibujaOpenSet = function () {
    ctx.fillStyle = '#008000'; // color verde para nodos en el openSet
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }

  // método para dibujar las casillas en el closedSet (nodos ya evaluados)
  this.dibujaClosedSet = function () {
    ctx.fillStyle = '#800000'; // color rojo oscuro para nodos en el closedSet
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }

  // método para dibujar el camino encontrado
  this.dibujaCamino = function () {
    ctx.fillStyle = '#00FFFF'; // color cian para el camino encontrado
    ctx.fillRect(this.x * anchoT, this.y * altoT, anchoT, altoT); // dibujar el rectángulo
  }
}

// función de inicialización
function inicializa() {
  canvas = document.getElementById('canvas'); // obtener el elemento <canvas> del documento
  ctx = canvas.getContext('2d'); // obtener el contexto de dibujo en 2d del canvas

  // calcular el tamaño de cada celda
  anchoT = parseInt(canvas.width / columnas); // ancho de cada celda
  altoT = parseInt(canvas.height / filas); // alto de cada celda

  // crear la matriz del escenario
  escenario = creaArray2D(filas, columnas); // crear una matriz 2d con el número de filas y columnas especificadas

  // añadir objetos casilla a la matriz
  for (i = 0; i < filas; i++) {
    for (j = 0; j < columnas; j++) {
      escenario[i][j] = new Casilla(j, i); // crear una nueva casilla en cada posición de la matriz
    }
  }

  // añadir vecinos a cada casilla
  for (i = 0; i < filas; i++) {
    for (j = 0; j < columnas; j++) {
      escenario[i][j].addVecinos(); // agregar vecinos a cada casilla
    }
  }

  // añadir event listener para manejar clics en el canvas
  canvas.addEventListener('click', function (event) {
    var rect = canvas.getBoundingClientRect(); // obtener el tamaño y la posición del canvas en la ventana
    var x = event.clientX - rect.left; // calcular la posición x del click en el canvas
    var y = event.clientY - rect.top; // calcular la posición y del click en el canvas
    var casillaX = Math.floor(x / anchoT); // calcular la columna de la casilla clickeada
    var casillaY = Math.floor(y / altoT); // calcular la fila de la casilla clickeada
    var casilla = escenario[casillaY][casillaX]; // obtener la casilla clickeada en la matriz

    if (modo === 'inicio') { // si el modo es 'inicio'
      if (principio) {
        principio.tipo = 0; // resetear el tipo si ya se había seleccionado
      }
      principio = casilla; // establecer la nueva casilla de inicio
      principio.tipo = 2; // tipo especial para el punto de inicio
    } else if (modo === 'fin') { // si el modo es 'fin'
      if (fin) {
        fin.tipo = 0; // resetear el tipo si ya se había seleccionado
      }
      fin = casilla; // establecer la nueva casilla de fin
      fin.tipo = 3; // tipo especial para el punto de fin
    } else if (modo === 'obstaculo') { // si el modo es 'obstaculo'
      if (casilla !== principio && casilla !== fin) { // no permitir cambiar el inicio o el fin
        casilla.tipo = casilla.tipo === 0 ? 1 : 0; // alternar tipo entre vacía y muro
      }
    }

    // habilitar botón de inicio solo si inicio y fin están definidos
    if (principio && fin) {
      document.getElementById('start').disabled = false; // habilitar el botón de inicio
    }

    // redibujar el escenario
    dibujaEscenario();
  });

  // dibujar el escenario inicial
  dibujaEscenario();

  // event listeners para los botones
  document.getElementById('set-start').addEventListener('click', function () {
    modo = 'inicio'; // establecer modo a 'inicio' para el próximo clic
  });

  document.getElementById('set-end').addEventListener('click', function () {
    modo = 'fin'; // establecer modo a 'fin' para el próximo clic
  });

  document.getElementById('set-obstacle').addEventListener('click', function () {
    modo = 'obstaculo'; // establecer modo a 'obstaculo' para el próximo clic
  });

  document.getElementById("start").addEventListener("click", function () {
    if (principio && fin) { // si los puntos de inicio y fin están definidos
      openSet.push(principio); // añadir el nodo inicial al openSet
      setInterval(function () { principal(); }, 1000 / FPS); // iniciar el bucle principal
    } else {
      alert("Primero debe configurar el inicio y el fin"); // advertir al usuario
    }
  });
}

// función para dibujar el escenario
function dibujaEscenario() {
  for (i = 0; i < filas; i++) { // recorrer todas las filas
    for (j = 0; j < columnas; j++) { // recorrer todas las columnas
      escenario[i][j].dibuja(); // dibujar cada casilla
    }
  }

  // dibujar openSet
  for (i = 0; i < openSet.length; i++) {
    openSet[i].dibujaOpenSet(); // dibujar cada casilla en openSet
  }

  // dibujar closedSet
  for (i = 0; i < closedSet.length; i++) {
    closedSet[i].dibujaClosedSet(); // dibujar cada casilla en closedSet
  }

  // dibujar el camino encontrado
  for (i = 0; i < camino.length; i++) {
    camino[i].dibujaCamino(); // dibujar cada casilla en el camino encontrado
  }
}

// función para borrar el canvas
function borraCanvas() {
  canvas.width = canvas.width; // borrar el contenido del canvas
  canvas.height = canvas.height; // borrar el contenido del canvas
}

// implementación del algoritmo a*, a star o a estrella
function algoritmo() {
  // seguir hasta encontrar solución
  if (terminado != true) { // si la búsqueda no ha terminado
    // seguir si hay algo en openSet
    if (openSet.length > 0) {
      var ganador = 0; // índice o posición dentro del array openSet del ganador

      // evaluar que openSet tiene un menor coste / esfuerzo
      for (i = 0; i < openSet.length; i++) {
        if (openSet[i].f < openSet[ganador].f) {
          ganador = i; // encontrar el nodo con el menor costo f
        }
      }

      // analizar la casilla ganadora
      var actual = openSet[ganador]; // nodo actual a evaluar

      // si hemos llegado al final, buscar el camino de vuelta
      if (actual === fin) {
        var temporal = actual;
        camino.push(temporal); // añadir el nodo final al camino

        // reconstruir el camino de vuelta desde el nodo final hasta el nodo inicial
        while (temporal.padre != null) {
          temporal = temporal.padre;
          camino.push(temporal); // añadir cada nodo al camino
        }

        console.log('camino encontrado');
        terminado = true; // marcar que el algoritmo ha terminado
      }
      // si no hemos llegado al final, seguir
      else {
        borraDelArray(openSet, actual); // eliminar el nodo actual del openSet
        closedSet.push(actual); // añadir el nodo actual al closedSet

        var vecinos = actual.vecinos; // obtener los vecinos del nodo actual

        // recorrer los vecinos de mi ganador
        for (i = 0; i < vecinos.length; i++) {
          var vecino = vecinos[i];

          // si el vecino no está en closedSet y no es una pared, hacer los cálculos
          if (!closedSet.includes(vecino) && vecino.tipo != 1) {
            var tempG = actual.g + 1; // calcular el nuevo costo g

            // si el vecino está en openSet y su peso es mayor
            if (openSet.includes(vecino)) {
              if (tempG < vecino.g) {
                vecino.g = tempG; // camino más corto
              }
            } else {
              vecino.g = tempG;
              openSet.push(vecino); // añadir el vecino al openSet
            }

            // actualizar valores
            vecino.h = heuristica(vecino, fin); // calcular la heurística h
            vecino.f = vecino.g + vecino.h; // calcular el costo total f

            // guardar el padre (de dónde venimos)
            vecino.padre = actual;
          }
        }
      }
    } else {
      console.log('No hay un camino posible');
      terminado = true; // el algoritmo ha terminado
    }
  }
}

// función principal que se ejecuta en cada frame
function principal() {
  if (principio && fin) { // si los puntos de inicio y fin están definidos
    borraCanvas(); // borrar el canvas
    algoritmo(); // ejecutar el algoritmo a*
    dibujaEscenario(); // redibujar el escenario
  }
}

// iniciar la configuración cuando el dom esté completamente cargado
document.addEventListener('DOMContentLoaded', inicializa); // llamar a inicializa cuando el dom esté listo
