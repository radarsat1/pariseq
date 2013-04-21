
var canv, ctx, mapimg, carsimg;
var currentSelected=null;
var currentDrag=null;

var currentCar=null;
var currentCursorPos=null;
var currentClosest=null;
var currentDest=null;

var cars = [];
var sounds = [];
var population = [];
var soundbanks = [];

var mainTimer = null;

var showMap = null;
var showRoads = null;

function distance(a, b)
{
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    return Math.sqrt(dx*dx + dy*dy);
}

function closestPoint(point)
{
    var dist = 1000000;
    var c = null;
    for (i in intersections) {
        var d = distance(intersections[i], point);
        if (d < dist) {
            dist = d;
            c = parseInt(i);
        }
    }
    return c;
}

// Find all intersections connected to the given intersection
function connectedIntersections(inter)
{
    var connected = {};
    for (r in roads)
    {
        if (roads[r][0] == inter)
            connected[roads[r][1]] = true;
        else if (roads[r][1] == inter)
            connected[roads[r][0]] = true;
    }

    var ar = [];
    for (c in connected)
        if (c!=="undefined")
            ar.push(parseInt(c));

    return ar;
}

// Find the intersection connected to the given intersection that is
// closest to the given point
function closestConnectedPoint(inter, point)
{
    var connected = connectedIntersections(inter);

    var dist = 1000000;
    var x = null;
    for (c in connected) {
        var d = distance(intersections[connected[c]], point);
        if (d < dist) {
            dist = d;
            x = connected[c];
        }
    }

    return x;
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
    if (showMap.checked)
        ctx.drawImage(mapimg, 0, 0);
    else
        ctx.clearRect(0,0,canv.width,canv.height);

    // if (dragging && currentSelected != null && currentDrag != null) {
    //     var s = currentSelected;
    //     var d = currentDrag;
    //     ctx.beginPath();
    //     ctx.moveTo(intersections[s][0], intersections[s][1]);
    //     ctx.lineTo(intersections[d][0], intersections[d][1]);
    //     ctx.strokeStyle = 'black';
    //     ctx.stroke();
    // }

    ctx.lineWidth = 1;

    if (showRoads.checked) {
        for (r in roads) {
            var a = intersections[roads[r][0]];
            var b = intersections[roads[r][1]];
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.strokeStyle = 'blue';
            ctx.stroke();
        }
    }

    for (var c in cars)
        drawCar(cars[c]);

    // draw drag & dropped car
    if (currentCar != null && currentClosest != null) {
        var x = intersections[currentClosest][0];
        var y = intersections[currentClosest][1];
        var i = carimgs[currentCar];
        var w = 15;
        var h = i.height/i.width*w;

        if (currentDest != null) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI/4);
            ctx.translate(-w/2, -h/2);
            ctx.drawImage(i, 0, 0, w, h);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(intersections[currentDest][0],
                       intersections[currentDest][1]);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.drawImage(i, x-w/2, y-h/2, w, h);
        }
    }
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

function onbankchange(bank)
{
    sounds = soundbanks[bank];
    updateDesc();
}

function updateDesc()
{
    for (s in sounds) {
        var x = parseInt(s)+1;
        var d = sounds[s].attributes.desc.value;
        var span = document.getElementById('car'+x+'desc');
        span.innerHTML = d;
    }
}

function initCar(c)
{
    cars[c].dist = distance(intersections[cars[c].from],
                                intersections[cars[c].to]);
    cars[c].at = 0.0;
    cars[c].vel = 0.0;

    population[cars[c].from].add(c);
}

function initCars()
{
    population = new Array(intersections.length);
    for (var i in intersections)
        population[i] = new Set();

    for (var c in cars)
        initCar(c);
}

function init()
{
    canv = document.getElementById('canv');
    ctx = canv.getContext('2d');

    showMap = document.getElementById('showmap');
    showRoads = document.getElementById('showroads');

    canv.onmousemove = function(e) {
        currentCursorPos = [e.pageX - canv.offsetLeft,
                            e.pageY - canv.offsetTop];

        if (currentCar != null) {
            if (currentDest != null)
                currentDest = closestConnectedPoint(currentClosest,
                                                    currentCursorPos);
            else
                currentClosest = closestPoint(currentCursorPos);
        }

        updateView();
    }

    canv.onmousedown = function(e) {
        currentSelected = closestPoint([e.pageX - canv.offsetLeft,
                                        e.pageY - canv.offsetTop]);
        updateView();
    }

    canv.onmouseup = function(e) {

        if (currentCar != null && currentClosest != null) {
            if (currentDest == null) {
                currentDest = currentClosest;
            }
            else {
                cars.push(
                    {car: currentCar,
                     from: currentClosest,
                     to: currentDest,
                     sound: currentCar,
                    });

                initCar(cars.length-1);

                setTimeout(function(){cars[cars.length-1].vel = 3;}, 200);

                currentCar = null;
                currentDest = null;
            }
        }

        updateView();
    }

    canv.onmouseout = function(e) {
    }

    mapimg = document.getElementById('map');

    carimgs = [ document.getElementById('car1'),
                document.getElementById('car2'),
                document.getElementById('car3'),
                document.getElementById('car4'),
                document.getElementById('car5'),
                document.getElementById('car6'),
              ];

    window.ondragstart = function() {return false;};

    for (var i in carimgs) {
        carimgs[i].onmousedown = (function(i){return function() {
            currentCar = parseInt(i);
        };})(i);
    }

    soundbanks = [
        [ document.getElementById('beep1'),
          document.getElementById('beep2'),
          document.getElementById('beep3'),
          document.getElementById('drum1'),
          document.getElementById('drum2'),
          document.getElementById('siren'),
        ],
        [ document.getElementById('piano1'),
          document.getElementById('piano2'),
          document.getElementById('piano3'),
          document.getElementById('piano4'),
          document.getElementById('piano5'),
          document.getElementById('piano6'),
        ]
    ];

    // default sounds
    onbankchange(0);

    cars = [];

    initCars();

    updateView();

    ongo();
}

function onstop()
{
    if (mainTimer != null)
        clearInterval(mainTimer)
    mainTimer = null;
    updateView();
    document.getElementById('go').disabled = false;
    document.getElementById('stop').disabled = true;
}

function ongo()
{
    stop();
    mainTimer = setInterval(moveCars, 30);
    document.getElementById('go').disabled = true;
    document.getElementById('stop').disabled = false;
}

function onclear()
{
    cars = [];
    updateView();
}
