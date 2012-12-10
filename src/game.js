var region;
var canvas;
var gl

var mouse = {x: 0, y: 0, changed: true};

function mouseMoveHandler(event) {
    var bounds = canvas.getBoundingClientRect();
    mouse.x = event.clientX - bounds.left;
    mouse.y = event.clientY - bounds.top;
    mouse.changed = true;
    return false;
}

function draw() {
    if (mouse.changed) {
        mouse.changed = false;
        
        var renderVariables = new JSTerrain.RenderVariables();
        renderVariables.region = region;
        renderVariables.LODDistances = [32, 128, 256, 512, 1024];
        renderVariables.morphEnabled = true;
        renderVariables.eyePosition = {x: mouse.x, y: mouse.y, z: 0}
        
        JSTerrain.renderRegion(renderVariables);
        
        for (var renderStruct = renderVariables.renderStackSize - 1; renderStruct >= 0; renderStruct--) {
            var chunkID = renderVariables.renderStack[renderStruct].chunkID;
            var pos = JSTerrain.chunkConstants[chunkID].min;
            var size = JSTerrain.chunkConstants[chunkID].size;
            
        }
    }
}

function start() {
    canvas = document.getElementById("game");
    initGL(canvas);
    canvas.addEventListener("mousemove", mouseMoveHandler, false);
    
    region = new JSTerrain.Region(gl, new Uint16Array(256 * 256), true);
    
    setInterval(draw, 30);
}

// Borrowed from: http://learningwebgl.com/blog/?p=28 :)
function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch(e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}
