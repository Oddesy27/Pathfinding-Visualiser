const SVG = document.querySelector('svg');
const VIEWBOX_WIDTH = 300;

const WALLCOLOUR = 'gray';
const DEFAULTCOLOUR = 'white';
const STARTCOLOUR = 'green';
const ENDCOLOUR = 'red';
const EXPLOREDCOLOUR = 'cyan';
const PATHCOLOUR = 'blue';
const LIGHT_WEIGHTCOLOUR = 'hsl(39, 100%, 75%)';
const MEDIUM_WEIGHTCOLOUR = 'hsl(39, 100%, 50%)';
const HEAVY_WEIGHTCOLOUR = 'hsl(39, 100%, 25%)';


class DoublyLinkedNode {
    constructor(data, prev = null, next = null) {
        this.data = data;
        this.prev = prev;
        this.next = next;
    }
}

class DoublyLinkedList {
    constructor(firstNode = null, lastNode = null) {
        this.firstNode = firstNode;
        this.lastNode = lastNode;
    }

    insertBefore(node, data) {
        let newNode = new DoublyLinkedNode(data);
        newNode.next = node;
        if (newNode.prev === null) {
            this.firstNode = newNode;
        } else {
            newNode.prev = node.prev;
            node.prev.next = newNode;
        }
        node.prev = newNode;
    }

    insertAfter(node, data) {
        let newNode = new DoublyLinkedNode(data);
        newNode.prev = node;
        if (node.next === null) {
            this.lastNode = newNode;
        } else {
            newNode.next = node.next;
            node.next.prev = newNode;
        }
        node.next = newNode;
    }

    insertBeginning(data) {
        let node = new DoublyLinkedNode(data);
        if (this.firstNode === null) {
            this.firstNode = node;
            this.lastNode = node;
            node.prev = null;
            node.next = null;
        } else {
            this.insertBefore(this.firstNode, data)
        }
    }
    insertEnd(data) {
        if (this.lastNode === null) {
            this.insertBeginning(data);    
        } else {
            this.insertAfter(this.lastNode, data);
        }
    }

    remove(node) {
        if (node.prev === null) {
            this.firstNode = node.next;
        } else {
            node.prev.next = node.next;
        }

        if (node.next === null) {
            this.lastNode = node.prev;
        } else {
            node.next.prev = node.prev;
        }
        
        return node.data;
    }

    removeFirst() {
        return this.remove(this.firstNode);
    }

    isEmpty() {
        return this.firstNode === null;
    }
}

class Queue {
    constructor() {
        this.elements = new DoublyLinkedList();
    }

    enqueue(element) {
        this.elements.insertEnd(element);
    }

    dequeue() {
        return this.elements.removeFirst();
    }

    isEmpty() {
        return this.elements.isEmpty();
    }
}

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(coord) {
        if (this.x === coord.x && this.y === coord.y) {
            return true;
        } else {
            return false;
        }
    }
}

const DirectionVectors = [
    new Coord(0, -1),
    new Coord(1, 0),
    new Coord(0, 1),
    new Coord(-1, 0)
];

function addCoords(coord1, coord2) {
    return new Coord(coord1.x + coord2.x, coord1.y + coord2.y);
}

class Grid {
    constructor(width, height, svg) {
        this.width = width;
        this.height = height;
        this.svg = svg;
        this.start = 0;
        this.end = (width - 1) + (height - 1) * width;

        this.lastSquare = null;
        this.findingPath = false;
        this.hasFoundPath = false;

        this.nodes = [];
        this.adjacencyList = [];
        this.squares = [];
        this.pathFindingSquares = [];
        this.weights = [];
        this.isWall = [];
        
        // Generate Nodes
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.nodes.push(new Coord(x, y));
                this.weights.push(1);
                this.isWall.push(false);
            }
        }
        
        // Generate Edges
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];
            let edges = [];
            for (let j = 0; j < DirectionVectors.length; j++) {
                let neighbour = addCoords(node, DirectionVectors[j]);
                if (neighbour.x >= 0 && neighbour.x <= this.width - 1 && neighbour.y >= 0 && neighbour.y <= this.height - 1) {
                    edges.push(this.coordToIndex(neighbour));
                }
            }
            this.adjacencyList.push(edges);
        }
        
        // Generate SVG Squares
        for (let j = 0; j < this.height; j++) {
            for (let i = 0; i < this.width; i++) {
                let squareX = i * VIEWBOX_WIDTH / this.width + 1;
                let squareY = j * VIEWBOX_WIDTH / this.height + 1;
                let squareSize = (VIEWBOX_WIDTH - this.width * 2) / this.width;
                let squareColour = DEFAULTCOLOUR;
                if (i + j * (width - 1) === this.start) {
                    squareColour =  STARTCOLOUR;
                } else if (i + j * (width) === this.end) {
                    squareColour = ENDCOLOUR;
                }

                this.squares.push(this.createSquare(squareX, squareY, squareSize, squareColour));

                let pathFindingSquare = this.createSquare(squareX + 2, squareY + 2, squareSize - 4, EXPLOREDCOLOUR);
                pathFindingSquare.setAttribute('pointer-events', 'none');
                pathFindingSquare.setAttribute('visibility', 'hidden');
                this.pathFindingSquares.push(pathFindingSquare);
            }
        }

        this.createSVGPointerEvents();
    }

    coordToIndex(coord) {
        return coord.x + coord.y * this.width;
    }

    indexToCoord(node) {
        return new Coord(node % this.width, Math.floor(node / this.width))
    }

    createSquare(x, y, size, color = DEFAULTCOLOUR) {
        let square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        square.setAttribute('x', x);
        square.setAttribute('y', y);
        square.setAttribute('rx', 1);
        square.setAttribute('ry', 1);
        square.setAttribute('width', size);
        square.setAttribute('height', size);
        square.setAttribute('fill', color);
        this.svg.appendChild(square);
        return square;
    }

    svgPosToGridIndex(svgX, svgY) {
        let x = Math.round((svgX - 1) / (VIEWBOX_WIDTH / this.width));
        let y = Math.round((svgY - 1) / (VIEWBOX_WIDTH / this.height));
        let coord = new Coord(x, y);
        return this.coordToIndex(coord);
    }

    clearNeighbours(node) {
        for (let neighbour of this.adjacencyList[node]) {
            let nodeIndex = this.adjacencyList[neighbour].indexOf(node);
            this.adjacencyList[neighbour].splice(nodeIndex, 1);
        }
        this.adjacencyList[node] = [];
    }

    regenerateNeighbours(node) {
        for (let j = 0; j < DirectionVectors.length; j++) {
            let neighbourCoords = addCoords(grid.nodes[node], DirectionVectors[j]);
            if (neighbourCoords.x >= 0 && neighbourCoords.x <= this.width - 1 
                && neighbourCoords.y >= 0 && neighbourCoords.y <= this.height - 1 
            ) {
                let neighbour = this.coordToIndex(neighbourCoords);
                if (!this.isWall[neighbour]) {
                    this.adjacencyList[node].push(neighbour);
                    this.adjacencyList[neighbour].push(node);
                } 
            }
        }
    }

    setWeight(node, weight) {
        this.weights[node] = weight;
    }

    getManhattanDistance(node1, node2) {
        let coord1 = this.indexToCoord(node1);
        let coord2 = this.indexToCoord(node2);
        return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y);
    }

    breadthFirstSearch() {
        let frontier = new Queue();
        let isExplored = new Array(this.width * this.height).fill(false);
        let previousNode = new Array(this.width * this.height).fill(null);
        let exploredNodesOrder = [];
        frontier.enqueue(this.start);
        isExplored[this.start] = true;

        let isEndFound = false;
        while(!frontier.isEmpty() && !isEndFound) {
            let node = frontier.dequeue();
            for (let neighbour of this.adjacencyList[node]) {
                if (!isExplored[neighbour]) {
                    previousNode[neighbour] = node;
                    if (neighbour === this.end) {
                        isEndFound = true;
                        break;
                    }
                    exploredNodesOrder.push(neighbour);
                    isExplored[neighbour] = true;
                    frontier.enqueue(neighbour);
                }
            }
        }

        let path = [this.end];
        let nextNode = this.end;
        while (previousNode[nextNode] !== null) {
            path.push(previousNode[nextNode]);
            nextNode = previousNode[nextNode];
        }
        return [path.toReversed(), exploredNodesOrder];
    }

    depthFirstSearch() {
        let frontier = [];
        let isExplored = new Array(this.width * this.height).fill(false);
        let previousNode = new Array(this.width * this.height).fill(null);
        let exploredNodesOrder = [];
        frontier.push(this.start);

        let isEndFound = false;
        while(frontier.length !== 0 && !isEndFound) {
            let node = frontier.pop();
            if (!isExplored[node]) {
                if (node != this.start) {
                    exploredNodesOrder.push(node);
                }
                isExplored[node] = true;
                
                for (let neighbour of this.adjacencyList[node]) {
                    if (!isExplored[neighbour]) {
                        previousNode[neighbour] = node;
                        if (neighbour === this.end) {
                            isEndFound = true;
                            break;
                        }
                        frontier.push(neighbour);
                    }
                }
            }   
        }

        let path = [this.end];
        let nextNode = this.end;
        while (previousNode[nextNode] !== null) {
            path.push(previousNode[nextNode]);
            nextNode = previousNode[nextNode];
        }
        return [path.toReversed(), exploredNodesOrder];

    }

    dijkstraSearch() {
        let distances = new Array(this.width * this.height).fill(null);
        let previousNode = new Array(this.width * this.height).fill(null);
        let isExplored = new Array(this.width * this.height).fill(false);
        let frontier = new DoublyLinkedList();
        let exploredNodesOrder = [];
        
        frontier.insertEnd(this.start);
        distances[this.start] = 0;

        // Find closest node
        while (!frontier.isEmpty()) {
            let closestNode = frontier.firstNode;
            if (frontier.firstNode !== frontier.lastNode) {
                let nextNode = frontier.firstNode;
                while (nextNode !== null) {
                    if (distances[nextNode.data] < distances[closestNode.data]) {
                        closestNode = nextNode;
                    }
                    nextNode = nextNode.next;
                }
            }
            let node = closestNode.data;
            if (node === this.end) {
                break;
            }
            exploredNodesOrder.push(node);
            frontier.remove(closestNode);
            isExplored[node] = true;

            // Update neighbours
            for (let neighbour of this.adjacencyList[node]) {
                let neighbourDistance = distances[node] + this.weights[neighbour];
                if (distances[neighbour] === null) {
                    distances[neighbour] = neighbourDistance;
                    frontier.insertEnd(neighbour);
                    previousNode[neighbour] = node;
                } else if (neighbourDistance < distances[neighbour]) {
                    distances[neighbour] = neighbourDistance;
                    previousNode[neighbour] = node;
                }
            }    
        }
        
        let path = [this.end];
        let nextNode = previousNode[this.end];
        while (nextNode !== null) {
            path.push(nextNode);
            nextNode = previousNode[nextNode];
        }
        return [path.toReversed(), exploredNodesOrder];
    }

    aStarSearch() {
        let gValues = new Array(this.width * this.height).fill(null);
        let hValues = new Array(this.width * this.height).fill(null);
        let previousNode = new Array(this.width * this.height).fill(null);
        let isExplored = new Array(this.width * this.height).fill(false);
        let frontier = new DoublyLinkedList();
        let exploredNodesOrder = [];

        frontier.insertEnd(this.start);
        gValues[this.start] = 0;
        hValues[this.start] = this.getManhattanDistance(this.start, this.end);

        while(!frontier.isEmpty()) {
            let closestNode = frontier.firstNode;
            let closestDistance = gValues[closestNode.data] + hValues[closestNode.data];
            if(frontier.firstNode !== frontier.lastNode) {
                let nextNode = frontier.firstNode;
                while(nextNode.next !== null) {
                    nextNode = nextNode.next;
                    let nextNodeDistance = gValues[nextNode.data] + hValues[nextNode.data];
                    if (nextNodeDistance < closestDistance 
                        || (nextNodeDistance === closestDistance && hValues[nextNode.data] < hValues[closestNode.data])
                    ) {
                        closestNode = nextNode;
                        closestDistance = nextNodeDistance;
                    }
                }
            }

            let node = closestNode.data;
            console.log(node, closestDistance);
            if (node === this.end) {
                break;
            }

            frontier.remove(closestNode);
            isExplored[node] = true;
            exploredNodesOrder.push(node);
            
            for (let neighbour of this.adjacencyList[node]) {
                let newGValue = gValues[node] + this.weights[neighbour];
                let newHValue = this.getManhattanDistance(neighbour, this.end);
                if (gValues[neighbour] === null) {
                    frontier.insertEnd(neighbour);
                } 
                
                if (gValues[neighbour] === null || newGValue + newHValue < gValues[neighbour] + hValues[neighbour]) {
                    gValues[neighbour] = newGValue;
                    hValues[neighbour] = newHValue;
                    previousNode[neighbour] = node;
                }
            }
        }

        let path = [this.end];
        let nextNode = previousNode[this.end];
        while (nextNode !== null) {
            path.push(nextNode);
            nextNode = previousNode[nextNode];
        }
        return [path.toReversed(), exploredNodesOrder];
    }

    findPath() {
        this.findingPath = true;
        for (let square of grid.pathFindingSquares) {
            square.setAttribute('visibility', 'hidden');
        }
    
        let searchType = document.getElementById('searchType').value;
        let path;
        let exploredNodesOrder;
        if (searchType === 'Breadth First Search') {
            [path, exploredNodesOrder] = grid.breadthFirstSearch();
        } else if (searchType === 'Depth First Search') {
            [path, exploredNodesOrder] = grid.depthFirstSearch();
        } else if (searchType === "Dijkstra's Algorithm") {
            [path, exploredNodesOrder] = grid.dijkstraSearch();
        } else if (searchType === 'A* Search Algorithm') {
            [path, exploredNodesOrder] = grid.aStarSearch();
        }
    
        if (exploredNodesOrder.length === 0) {
            this.findingPath = false;
            return;
        }
    
        let count = 0;
        let interval = setInterval(() => {
            let square = grid.pathFindingSquares[exploredNodesOrder[count]];
            square.setAttribute('fill', EXPLOREDCOLOUR);
            square.setAttribute('visibility', 'visible');
            count++;
    
            if (count === exploredNodesOrder.length) {
                clearInterval(interval);
                for (let node of path) {
                    let square = grid.pathFindingSquares[node];
                    square.setAttribute('fill', PATHCOLOUR);
                    square.setAttribute('visibility', 'visible');
                }
                this.findingPath = false;
                this.hasFoundPath = true;    
            }
        }, 100);
    }

    createSVGPointerEvents() {
        SVG.addEventListener('pointerdown', e => {
            if (this.findingPath){
                console.log('hello');
                return;
            }
            if (e.target.getAttribute('fill') === STARTCOLOUR || e.target.getAttribute('fill') === ENDCOLOUR) {
                this.lastSquare = e.target;
            }
        });
        
        SVG.addEventListener('pointermove', e => {
            if (this.findingPath){
                return;
            }
        
            if (this.lastSquare !== null && e.target !== this.lastSquare && e.target.tagName === 'rect' && e.target.getAttribute('fill') === DEFAULTCOLOUR) {
                if (this.hasFoundPath) {
                    for (let square of grid.pathFindingSquares) {
                        square.setAttribute('visibility', 'hidden');
                    }
                    this.hasFoundPath = false;
                }
                e.target.setAttribute('fill', this.lastSquare.getAttribute('fill'));
                this.lastSquare.setAttribute('fill', DEFAULTCOLOUR);
                this.lastSquare = e.target;
            }
        });
        
        SVG.addEventListener('pointerup', e => { 
            if (this.findingPath){
                return;
            }
        
            let brushType = document.getElementById('brushType').value;
            let squareColour = e.target.getAttribute('fill');
        
            if (this.lastSquare != null) {
                let x = this.lastSquare.getAttribute('x');
                let y = this.lastSquare.getAttribute('y');
                squareColour = this.lastSquare.getAttribute('fill');
                switch(squareColour) {
                    case STARTCOLOUR:
                        grid.start = grid.svgPosToGridIndex(x, y);
                        break;
                    case ENDCOLOUR:
                        grid.end = grid.svgPosToGridIndex(x, y);
                        break;
                }
            } else {
                let x = e.target.getAttribute('x');
                let y = e.target.getAttribute('y');
                let node = grid.svgPosToGridIndex(x, y);
                let brushColour = undefined;
                let brushWeight = undefined;
                switch(brushType) {
                    case 'Wall':
                        brushColour = WALLCOLOUR;
                        brushWeight = 1;
                        break;
                    case 'Light Weight':
                        brushColour = LIGHT_WEIGHTCOLOUR;
                        brushWeight = 5;
                        break;
                    case 'Medium Weight':
                        brushColour = MEDIUM_WEIGHTCOLOUR;
                        brushWeight = 10;
                        break;
                    case 'Heavy Weight':
                        brushColour = HEAVY_WEIGHTCOLOUR;
                        brushWeight = 15;
                        break;
                }
                
                if (squareColour !== STARTCOLOUR && squareColour !== ENDCOLOUR && squareColour !== brushColour) {
                    e.target.setAttribute('fill', brushColour);
                    grid.setWeight(node, brushWeight);
                    switch(brushType) {
                        case 'Wall':
                            grid.isWall[node] = true;
                            grid.clearNeighbours(node);
                            break;
                        default:
                            grid.isWall[node] = false;
                            grid.regenerateNeighbours(node);
                            break;
                    }
                } else if (squareColour === brushColour) {
                    e.target.setAttribute('fill', DEFAULTCOLOUR);
                    grid.setWeight(node, brushWeight);
                    grid.isWall[node] = false;
                    grid.regenerateNeighbours(node);
                }
            } 
            
            this.lastSquare = null;
        });
    }
}

let grid = new Grid(15, 15, SVG);