var region;
var canvas;
var context

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
        
        context.beginPath();
        context.rect(0, 0, 1024, 768);
        context.fillStyle = "#000000";
        context.fill();
        
        for (var regionX = 0; regionX < 4; regionX++) {
            for (var regionY = 0; regionY < 3; regionY++) {
                var renderVariables = new JSTerrain.RenderVariables();
                renderVariables.region = region;
                renderVariables.LODDistances = [32, 128, 256, 512, 1024];
                renderVariables.morphEnabled = true;
                renderVariables.eyePosition = {x: mouse.x - regionX * 256, y: mouse.y - regionY * 256, z: 0}
                
                JSTerrain.renderRegion(renderVariables);
                
                context.save();
                context.translate(regionX * 256, regionY * 256);
                
                for (var renderStruct = renderVariables.renderStackSize - 1; renderStruct >= 0; renderStruct--) {
                    var chunkID = renderVariables.renderStack[renderStruct].chunkID;
                    var pos = JSTerrain.chunkConstants[chunkID].min;
                    var size = JSTerrain.chunkConstants[chunkID].size;
                    
                    var colour = Math.floor((1 - (JSTerrain.chunkConstants[chunkID].level + renderVariables.renderStack[renderStruct].morph) / 4) * 256);
                    
                    context.beginPath();
                    context.rect(pos.x, pos.y, size, size);
                    context.fillStyle = "rgb(" + colour + ", " + colour + ", " + colour + ")";
                    context.fill();
                    context.stroke();
                }
                context.restore();
                
            }
        }
    }
}

function start() {
    canvas = document.getElementById("game");
    context = canvas.getContext("2d");
    canvas.addEventListener("mousemove", mouseMoveHandler, false);
    
    region = new JSTerrain.Region(null, new Uint16Array(256 * 256), true);
    
    setInterval(draw, 30);
}
