
var canv, ctx, mapimg, carsimg;
var dragging=false;
var currentSelected=null;
var currentDrag=null;

var cars = [];
var sounds = [];
var population = [];

function distance(a, b)
{
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    return Math.sqrt(dx*dx + dy*dy);
}

function closestPoint(x, y)
{
    var dist = 1000000;
    var c = null;
    for (i in intersections) {
        var d = distance(intersections[i], [x,y]);
        if (d < dist) {
            dist = d;
            c = i;
        }
    }
    return c;
}

function Set()
{
    this.store = [];
    this.add = function(x) {
        if (x in this.store)
            return;
        this.store[x] = true;
    }
    this.remove = function(x) {
        if (x in this.store)
            delete this.store[x];
    }
}

function drawCar(car)
{
    var img = carimgs[car.car];
    var w = 15;
    var h = img.height/img.width*15;

    var x1 = intersections[car.from][0];
    var y1 = intersections[car.from][1];
    var x2 = intersections[car.to][0];
    var y2 = intersections[car.to][1];

    var angle = Math.atan( (y2 - y1) / (x2 - x1) ) + Math.PI/2;
    if (x2 < x1)
        angle += Math.PI;

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.translate(-w/2, -h/2);
    ctx.translate(0, -car.at);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
}

function updateView()
{
    //ctx.drawImage(mapimg, 0, 0);
    ctx.clearRect(0,0,canv.width,canv.height);

    for (p in intersections) {
        ctx.beginPath();
        ctx.arc(intersections[p][0], intersections[p][1], 4, 0, 2*Math.PI);
        ctx.fill();
    }

    if (dragging && currentSelected != null && currentDrag != null) {
        var s = currentSelected;
        var d = currentDrag;
        ctx.beginPath();
        ctx.moveTo(intersections[s][0], intersections[s][1]);
        ctx.lineTo(intersections[d][0], intersections[d][1]);
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }

    for (r in roads) {
        var a = intersections[roads[r][0]];
        var b = intersections[roads[r][1]];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }

    for (var c in cars)
        drawCar(cars[c]);
}

function moveCars()
{
    for (var c in cars)
    {
        var d = cars[c].at + cars[c].vel;

        if (cars[c].vel > 0 && d > cars[c].dist)
        {
            cars[c].at = cars[c].dist;
            cars[c].vel = -6;

            // start all cars at intersection
            var p = population[cars[c].to];
            for (n in p.store)
            {
                cars[n].vel = 3;
                p.remove(n);

                // play their starting sound
                sounds[cars[n].sound].play();
            }
        }
        else if (cars[c].vel < 0 && d < 0)
        {
            cars[c].vel = 0;
            cars[c].at = 0;

            population[cars[c].from].add(c);
        }
        else
            cars[c].at = d;
    }

    updateView();
}

function initCars()
{
    population = new Array(intersections.length);
    for (var i in intersections)
        population[i] = new Set();

    for (var c in cars)
    {
        cars[c].dist = distance(intersections[cars[c].from],
                                intersections[cars[c].to]);
        cars[c].at = 0.0;
        cars[c].vel = 0.0;

        population[cars[c].from].add(c);
    }

    cars[0].vel = 3;
}

function init()
{
    canv = document.getElementById('canv');
    ctx = canv.getContext('2d');

    canv.onmousemove = function(e) {
        if (dragging) {
            currentDrag = closestPoint(e.x - canv.offsetLeft,
                                       e.y - canv.offsetTop);
            updateView();
        }
    }

    canv.onmousedown = function(e) {
        dragging = true;
        currentSelected = closestPoint(e.x - canv.offsetLeft,
                                       e.y - canv.offsetTop);
        updateView();
    }

    canv.onmouseup = function(e) {
        if (dragging) {
            dragging = false;
            console.log(currentSelected + ' -> ' + currentDrag);
            roads.push([currentSelected, currentDrag]);
        }
        updateView();
    }

    canv.onmouseout = function(e) {
        dragging = false;
    }

    mapimg = document.getElementById('map');

    carimgs = [ document.getElementById('car1'),
                document.getElementById('car2') ];

    sounds = [ document.getElementById('beep1'),
               document.getElementById('beep2'),
               document.getElementById('beep3'),
               document.getElementById('car1'),
               document.getElementById('car2') ];

    cars = [
        {car: 0, from: 130, to: 128, sound: 0},
        {car: 1, from: 128, to: 126, sound: 1},
        {car: 1, from: 126, to: 130, sound: 2},
    ];

    initCars();

    setInterval(moveCars, 100);

    updateView();
}
