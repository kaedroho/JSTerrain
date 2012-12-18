var region;
var canvas;
var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var mouse = {x: 0, y: 0, changed: true};

function mouseMoveHandler(event) {
    var bounds = canvas.getBoundingClientRect();
    mouse.x = event.clientX - bounds.left;
    mouse.y = event.clientY - bounds.top;
    mouse.changed = true;
    return false;
}

function draw() {
    // Only re render if the mouse has moved
    if (mouse.changed) {
        mouse.changed = false;
        
        // Set render variables
        var renderVariables = new JSTerrain.RenderVariables();
        renderVariables.region = region;
        renderVariables.LODDistances = [32, 128, 256, 512, 1024];
        renderVariables.morphEnabled = true;
        renderVariables.eyePosition = {x: mouse.x / 3, y: mouse.y / 3, z: 0}
        
        // Render the region
        JSTerrain.renderRegion(renderVariables);
        
        // Clear backbuffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Projection matrix
        mat4.perspective(90, 1024 / 768, 0.1, 1000.0, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.pUniform, false, pMatrix);
        
        // Model view matrix
        mat4.identity(mvMatrix);
        mat4.scale(mvMatrix, [1.0, -1.0, 1]);
        mat4.rotateX(mvMatrix, 0.8, mvMatrix);
        mat4.translate(mvMatrix, [-100, -200, -100]);
        mat4.scale(mvMatrix, [1.0, 1.0, 0.001]);
        gl.uniformMatrix4fv(shaderProgram.mvUniform, false, mvMatrix);
        
        // Bind indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indexBuffer);
        
        // Draw render stack
        var currentVB = -1;
        for (var renderStruct = renderVariables.renderStackSize - 1; renderStruct >= 0; renderStruct--) {
            var chunkID = renderVariables.renderStack[renderStruct].chunkID;
            var startIndex = JSTerrain.chunkConstants[chunkID].startIndex;
            var vb = JSTerrain.chunkConstants[chunkID].vb;
            
            // Load vertex buffer
            if (vb != currentVB) {
                if (vb == 0) {
                    continue;
                }
                
                // Load vertex buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, region.vertexBuffers[vb - 1]);
                gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
                currentVB = vb;
            }
            
            // Draw chunk
            gl.drawElements(gl.LINES, 1536, gl.UNSIGNED_SHORT, startIndex * 2);
        }
    }
}

function start() {
    // Setup
    canvas = document.getElementById("game");
    initGL(canvas);
    shaderProgram = initShaders();
    canvas.addEventListener("mousemove", mouseMoveHandler, false);
    
    // Init JSTerrain
    JSTerrain.init(gl);
    
    // Create heights array
    var heights = new Uint16Array(257 * 257)
    
    // Fill heights array with random data
    for (var x = 0; x < 257; x++) {
        for (var y = 0; y < 257; y++) {
            heights[y * 257 + x] = Math.random() * 60000;
        }
    }
    
    // Smooth the data
    for (var i = 0; i < 15; i++) {
        for (var x = 0; x < 257; x++) {
            for (var y = 0; y < 257; y++) {
                var parts = 4;
                var value = heights[y * 257 + x] * 4
                if (x > 0) {
                    parts++;
                    value += heights[y * 257 + (x - 1)];
                }
                if (y > 0) {
                    parts++;
                    value += heights[(y - 1) * 257 + x];
                }
                if (x < 256) {
                    parts++;
                    value += heights[y * 257 + (x + 1)];
                }
                if (y < 256) {
                    parts++;
                    value += heights[(y + 1) * 257 + x];
                }
                heights[y * 257 + x] = value / parts;
            }
        }
    }
    
    // Create region
    region = new JSTerrain.Region(heights, true);
    
    // Start main loop
    setInterval(draw, 30);
}

// Borrowed from: http://learningwebgl.com/blog/?p=28 :)
function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        
        indicesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indices, gl.STATIC_DRAW);
    } catch(e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function initShaders() {
    // Vertex shader
    vert_src = "attribute vec2 pos;\n\nuniform mat4 matp;\nuniform mat4 matmv;\n\nvoid main(void) {\ngl_Position = matp * matmv * vec4(mod(pos.x, 257.0), floor(pos.x / 257.0), pos.y, 1.0);\n}";
    
    
    var vert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert, vert_src);
    gl.compileShader(vert);
    if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(vert));
        return null;
    }
    
    // Fragment shader
    frag_src = "precision mediump float;\n\nvoid main(void) {\ngl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n}";
    var frag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag, frag_src);
    gl.compileShader(frag);
    if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(frag));
        return null;
    }
    
    // Program
    var prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    
    prog.posAttribute = gl.getAttribLocation(prog, "pos");
    gl.enableVertexAttribArray(prog.posAttribute);
    
    prog.mvUniform = gl.getUniformLocation(prog, "matmv");
    prog.pUniform = gl.getUniformLocation(prog, "matp");
    
    return prog;
}
