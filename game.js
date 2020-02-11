const GAME_WIDTH = screen.width
const GAME_HEIGHT = screen.height;

var PlanetManager, Planet;
var FactionManager, Faction;
var TransportManager, Transport;
var Sun;

var canvas, c;
var Mouse;

Mouse = {
    x: null,
    y: null,
    down: false,
    connecting: false
}

Sun = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    radius: 50,
    update: function() {},
    render: function(c) {
        c.beginPath();
        c.fillStyle = "yellow";
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        c.fill();
        c.closePath();
    }
}

PlanetManager = {
    planets: new Array(),
    planetSelectionExtraRadius: 20,
    selectedOriginPlanet: null,
    selectedTargetPlanet: null,
    createPlanet: function(sunToOrbit, distanceFromSun, initAngle, orbitAmountPerFrame, radius, color, growthFrameTime, planetName) {
        this.planets.push(new Planet(sunToOrbit, distanceFromSun, initAngle, orbitAmountPerFrame, radius, color, growthFrameTime, planetName));
    },
    getPlanet: function(planetName) {
        for (var i = 0; i < this.planets.length; i++) {
            if (this.planets[i].getPlanetName() == planetName) {
                return this.planets[i];
            }
        }
        return false;
    },
    trackHover: function(mouseX, mouseY) {
        for (var i = 0; i < this.planets.length; i++) {
            if (pointDistance(mouseX, mouseY, this.planets[i].x, this.planets[i].y) <= this.planets[i].radius + this.planetSelectionExtraRadius) {
                if (!this.planets[i].hovering) {
                    this.planets[i].onHoverEnter();
                } else {
                    this.planets[i].onHover();
                }
                this.planets[i].hovering = true;
            } else {
                if (this.planets[i].hovering) {
                    this.planets[i].onHoverExit();
                }
                this.planets[i].hovering = false;
            }
        }
    },
    update: function() {
        for (var i = 0; i < this.planets.length; i++) {
            this.planets[i].update();
        }
        this.trackHover(Mouse.x, Mouse.y);
        if (this.selectedOriginPlanet != null && this.selectedTargetPlanet != null) {
            var controllableFactionName = FactionManager.getPlayerControllableFaction().factionName;
            var numOfUnitsToTransport = this.selectedOriginPlanet.units[controllableFactionName] >= 50? 50 : this.selectedOriginPlanet.units[controllableFactionName];
            for (var i = 0; i < numOfUnitsToTransport; i++) {
                this.selectedOriginPlanet.removeUnit(controllableFactionName);
                var rand = (Math.random() - 0.5) * (Math.random() * this.selectedOriginPlanet.radius) * 4;
                TransportManager.createTransport(this.selectedOriginPlanet.x + rand, this.selectedOriginPlanet.y + rand, Sun, this.selectedTargetPlanet, controllableFactionName, 1);
            }



            this.selectedOriginPlanet = null;
            this.selectedTargetPlanet = null;
        }
    },
    render: function(c) {
        for (var i = 0; i < this.planets.length; i++) {
            this.planets[i].render(c);
        }
        if (this.selectedOriginPlanet != null) {
            c.strokeStyle = "white";
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(this.selectedOriginPlanet.x, this.selectedOriginPlanet.y);
            if (this.selectedTargetPlanet != null) {
                c.lineTo(this.selectedTargetPlanet.x, this.selectedTargetPlanet.y);
            } else {
                c.lineTo(Mouse.x, Mouse.y);
            }
            c.stroke();
            c.closePath();
        }
    }
};

Planet = function(orbitPoint, distanceFromOrbitPoint, initAngle, orbitAmountPerFrame, radius, color, growthFrameTime, planetName) {
    this.orbitPoint = orbitPoint;
    this.distanceFromOrbitPoint = distanceFromOrbitPoint;
    this.angle = initAngle;
    this.x = this.orbitPoint.x + Math.cos(this.angle) * this.distanceFromOrbitPoint;
    this.y = this.orbitPoint.y + Math.sin(this.angle) * this.distanceFromOrbitPoint;
    this.radius = radius;
    this.color = color;
    this.planetName = planetName;

    this.growthCounter = 0;
    this.units = new Object();
    this.controllingFaction = null;

    this.trailPoints = new Array();
    this.trailCounter = 0;
    this.trailFrameTimeInterval = 100;
    this.trailMaxLength = 30;

    this.hovering = false;
    this.unselected = true;

    this.getPlanetName = function() {
        return this.planetName;
    }
    this.addUnit = function(factionName) {
        if (!(factionName in this.units)) {
            this.units[factionName] = 1;
        } else {
            this.units[factionName]++;
        }
    }
    this.removeUnit = function(factionName) {
        if (!(factionName in this.units)) {
            return false;
        } else {
            this.units[factionName]--;
        }
    }
    this.getTotalUnits = function() {
        var totalUnits = 0;
        for (var faction in this.units) {
            if (this.units.hasOwnProperty(faction)) {
                totalUnits += this.units[faction];
            }
        }
        return totalUnits;
    }
    this.onHover = function() {
        if (unselected && Mouse.down) {
            PlanetManager.selectedOriginPlanet = this;
        } else if (!unselected && !Mouse.down) {
            PlanetManager.selectedTargetPlanet = this;
        }
    }
    this.onHoverEnter = function() {
        if (!Mouse.down) {
            unselected = true;
        } else {
            unselected = false;
        }
    }
    this.onHoverExit = function() {
        if (!Mouse.down) {
            unselected = false;
            PlanetManager.selectedOriginPlanet = null;
            PlanetManager.selectedTargetPlanet = null;
        } else {
            unselected = true;
        }
    }
    this.update = function() {
        this.angle += orbitAmountPerFrame;

        if (this.angle > 2 * Math.PI) {
            this.angle -= 2 * Math.PI;
        }

        this.x = this.orbitPoint.x + Math.cos(this.angle) * this.distanceFromOrbitPoint;
        this.y = this.orbitPoint.y + Math.sin(this.angle) * this.distanceFromOrbitPoint;

        if (Object.keys(this.units).length == 1) {
            this.controllingFaction = (Object.keys(this.units)[0]).toString();
            this.growthCounter++;
            if (this.growthCounter >= growthFrameTime) {
                this.units[Object.keys(this.units)[0]]++;
                this.growthCounter = 0;
            }
        } else {
            this.controllingFaction = null;
            var totalUnits = this.getTotalUnits();
            for (var faction in this.units) {
                if (this.units.hasOwnProperty(faction)) {
                    if (this.units[faction] <= 0) {
                        delete this.units[faction];
                        continue;
                    }
                    var casualtyProbability = ((totalUnits - this.units[faction]) / this.units[faction]) / 1000;
                    for (var i = 0; i < this.units[faction]; i++) {
                        if (Math.random() < casualtyProbability) {
                            this.units[faction]--;
                        }
                    }
                }
            }
        }

        this.trailCounter++;
        if (this.trailCounter >= this.trailFrameTimeInterval) {
            this.trailPoints.push([this.x, this.y]);
            this.trailCounter = 0;
        }
        if (this.trailPoints.length > this.trailMaxLength) {
            this.trailPoints.shift();
        }
    }
    this.render = function(c) {

        for (var i = 0; i < this.trailPoints.length; i++) {
            c.fillStyle = this.color;
            c.beginPath();
            c.arc(this.trailPoints[i][0], this.trailPoints[i][1], 2.5 * ((i + 1) / this.trailMaxLength), 0, 2 * Math.PI, false);
            c.fill();
            c.closePath();
        }

        var totalUnits = this.getTotalUnits();
        var prevAngle = 0;
        var factionRadius = this.radius + 12;

        c.lineWidth = 6;
        c.lineCap = "flat";

        for (var faction in this.units) {
            var angle = (this.units[faction] / totalUnits) * (2 * Math.PI);
            c.fillStyle = FactionManager.getFactionColor(faction);
            c.strokeStyle = FactionManager.getFactionColor(faction);

            c.beginPath();
            c.arc(this.x, this.y, factionRadius, prevAngle, prevAngle + angle, false);
            c.stroke();
            c.closePath();

            c.font = "16px Arial";
            c.textBaseline = "middle";
            c.textAlign = "center";
            c.fillText(
                this.units[faction],
                this.x + Math.cos(prevAngle + (angle / 2)) * (factionRadius + 20),
                this.y + Math.sin(prevAngle + (angle / 2)) * (factionRadius + 20)
            );

            prevAngle += angle;
        }

        c.fillStyle = this.color;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        c.closePath();
        c.fill();

        if (this.hovering || PlanetManager.selectedOriginPlanet == this) {
            c.strokeStyle = "gray";
            c.lineWidth = 1;
            c.beginPath();
            c.arc(this.x, this.y, this.radius + PlanetManager.planetSelectionExtraRadius, 0, 2 * Math.PI, false);
            c.closePath();
            c.stroke();
        }
    }
}

FactionManager = {
    factions: new Array(),
    createFaction: function(factionName, color, playerControllable) {
        this.factions.push(new Faction(factionName, color, playerControllable));
        return this.factions[this.factions.length - 1];
    },
    getFaction: function(factionName) {
        for (var i = 0; i < this.factions.length; i++) {
            if (this.factions[i].getFactionName() == factionName) {
                return this.factions[i];
            }
        }
        return false;
    },
    getPlayerControllableFaction: function() {
        for (var i = 0; i < this.factions.length; i++) {
            if (this.factions[i].playerControllable) {
                return this.factions[i];
            }
        }
        return false;
    },
    getFactionColor(factionName) {
        var faction = this.getFaction(factionName);
        return faction.color;
    }
};

Faction = function(factionName, color, playerControllable) {
    this.factionName = factionName;
    this.color = color;
    this.playerControllable = playerControllable;
    this.spawnUnits = function(numOfUnits, planetSpawnName) {
        var planet = PlanetManager.getPlanet(planetSpawnName);
        for (var i = 0; i < numOfUnits; i++) {
            planet.addUnit(this.factionName);
        }
    };
    this.getFactionName = function() {
        return this.factionName;
    };
}

TransportManager = {
    transports: new Array(),
    createTransport: function(x, y, orbitPoint, targetPoint, faction, numOfUnits) {
        this.transports.push(new Transport(x, y, orbitPoint, targetPoint, faction, numOfUnits));
    },
    update: function() {
        for (var i = 0; i < this.transports.length; i++) {
            if (this.transports[i].completed) {
                this.transports.splice(i, 1);
                i--;
                continue;
            }
            this.transports[i].update();
        }
    },
    render: function(c) {
        for (var i = 0; i < this.transports.length; i++) {
            this.transports[i].render(c);
        }
    }
}

Transport = function(x, y, orbitPoint, targetPoint, faction, numOfUnits) {
    this.randTargetOffset = targetPoint.radius * (Math.random() - 0.5);
    this.x = x;
    this.y = y;
    this.initDistanceFromOrbitPoint = pointDistance(this.x, this.y, orbitPoint.x, orbitPoint.y);
    this.distanceFromOrbitPoint = this.initDistanceFromOrbitPoint;
    this.angleFromOrbitPoint = Math.atan2(orbitPoint.y - this.y, orbitPoint.x - this.x);
    this.initAngleDifferenceToTargetPoint = angleDifference(this.angleFromOrbitPoint, targetPoint.angleFromOrbitPoint);
    this.targetPoint = targetPoint;
    this.faction = faction;
    this.numOfUnits = numOfUnits;
    this.completed = false;
    this.update = function() {
        //this.angleFromOrbitPoint = lerp(this.angleFromOrbitPoint, targetPoint.angleFromOrbitPoint, 0.02);
        this.x = orbitPoint.x - Math.cos(this.angleFromOrbitPoint) * this.distanceFromOrbitPoint;
        this.y = orbitPoint.y - Math.sin(this.angleFromOrbitPoint) * this.distanceFromOrbitPoint;

        var dx = this.x - targetPoint.x + this.randTargetOffset;
        var dy = this.y - targetPoint.y + this.randTargetOffset;
        var len = Math.sqrt(dx * dx + dy * dy);
        dx /= len ? len : 1.0; dy /= len ? len : 1.0;

        var dirx = Math.cos(this.angleFromOrbitPoint);
        var diry = Math.sin(this.angleFromOrbitPoint);

        dirx += (dx - dirx) * (0.01 + Math.abs(this.randTargetOffset) / 10000);
        diry += (dy - diry) * (0.01 + Math.abs(this.randTargetOffset) / 10000);

        this.angleFromOrbitPoint = Math.atan2(diry, dirx);
        this.distanceFromOrbitPoint = lerp(this.distanceFromOrbitPoint, targetPoint.distanceFromOrbitPoint + this.randTargetOffset, 0.04);

        if (pointDistance(this.x, this.y, targetPoint.x, targetPoint.y) < targetPoint.radius) {
            for (var i = 0; i < this.numOfUnits; i++) {
                targetPoint.addUnit(this.faction);
            }
            this.completed = true;
        }
    }
    this.render = function(c) {
        c.fillStyle = FactionManager.getFactionColor(this.faction);
        c.beginPath();
        c.arc(this.x, this.y, 1, 0, 2 * Math.PI, false);
        c.closePath();
        c.fill();
    }
}

function main() {
    canvas = document.getElementById("game-window");
    c = canvas.getContext("2d");
    c.lineCap = "round";
    c.font = "16px Arial";
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    canvas.addEventListener("mousemove", function(e) {
        var rect = canvas.getBoundingClientRect();
        Mouse.x = e.clientX - rect.left;
        Mouse.y = e.clientY - rect.top;
    }, false);

    canvas.addEventListener("mousedown", function(e) {
        Mouse.down = true;
    }, false);

    canvas.addEventListener("mouseup", function(e) {
        Mouse.down = false;
    }, false);

    init();

    var gameLoop = function() {
        update();
        render(c);
        window.requestAnimationFrame(gameLoop, canvas);
    }
    window.requestAnimationFrame(gameLoop, canvas);
}



function init() {
    PlanetManager.createPlanet(Sun, 200, Math.PI / 4, 0.001, 20, "orange", 60, "Raxus Prime");
    PlanetManager.createPlanet(Sun, 300, Math.PI, 0.00065, 10, "aqua", 60, "Alderaan");
    PlanetManager.createPlanet(Sun, 400, Math.PI, 0.00095, 6, "darkgray", 20, "Death Star");
    PlanetManager.createPlanet(Sun, 470, Math.PI, 0.00155, 6, "darkgray", 20, "Death Star 2");

    var rebellion = FactionManager.createFaction("Rebellion", "red");
    var empire = FactionManager.createFaction("Empire", "gray");
    var republic = FactionManager.createFaction("Republic", "white", true);
    var confederacy = FactionManager.createFaction("Confederacy", "blue");
    var unsc = FactionManager.createFaction("UNSW", "green");
    var covenent = FactionManager.createFaction("Covenent", "purple");

    rebellion.spawnUnits(500, "Raxus Prime");
    empire.spawnUnits(500, "Raxus Prime");
    republic.spawnUnits(500, "Raxus Prime");
    confederacy.spawnUnits(500, "Raxus Prime");
    unsc.spawnUnits(500, "Raxus Prime");
    covenent.spawnUnits(500, "Raxus Prime");

    rebellion.spawnUnits(500, "Alderaan");
    empire.spawnUnits(500, "Alderaan");
    republic.spawnUnits(500, "Alderaan");
    confederacy.spawnUnits(500, "Alderaan");
    unsc.spawnUnits(500, "Alderaan");
    covenent.spawnUnits(500, "Alderaan");

    republic.spawnUnits(500, "Death Star 2");
}

function update() {
    Sun.update();
    PlanetManager.update();
    TransportManager.update();
}

function render(c) {
    c.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    Sun.render(c);
    TransportManager.render(c);
    PlanetManager.render(c);
}

function pointDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function angleDifference(angleA, angleB) {
    return Math.abs((angleA + Math.PI - angleB) % (2 * Math.PI) - Math.PI);
}

function lerp(initValue, finalValue, ratio) {
    return initValue + (finalValue - initValue) * ratio;
}
