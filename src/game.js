var region;
var canvas;
var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var indicesBuffer;

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
        
        var currentVB = -1;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        mat4.perspective(90, 1024 / 768, 0.1, 1000.0, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.pUniform, false, pMatrix);
        for (var renderStruct = renderVariables.renderStackSize - 1; renderStruct >= 0; renderStruct--) {
            var chunkID = renderVariables.renderStack[renderStruct].chunkID;
            var pos = JSTerrain.chunkConstants[chunkID].min;
            var size = JSTerrain.chunkConstants[chunkID].size;
            var quad = JSTerrain.chunkConstants[chunkID].quad;
            
            // Load vertex buffer
            if (quad == 1 || quad == 2) {
                if (currentVB != 0) {
                    // Load vertex buffer 0
                    gl.bindBuffer(gl.ARRAY_BUFFER, region.vertexBuffers[0]);
                    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
                    currentVB = 0;
                }
            } else if (quad == 3 || quad == 4) {
                if (currentVB != 1) {
                    // Load vertex buffer 1
                    gl.bindBuffer(gl.ARRAY_BUFFER, region.vertexBuffers[1]);
                    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
                    currentVB = 1;
                }
            } else {
                continue;
            }
            
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [pos.x, pos.y, -700.0]);
            
            gl.uniformMatrix4fv(shaderProgram.mvUniform, false, mvMatrix);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
            gl.drawElements(gl.TRIANGLES, 1536, gl.UNSIGNED_SHORT, 0);
        }
    }
}

function start() {
    canvas = document.getElementById("game");
    initGL(canvas);
    shaderProgram = initShaders();
    
    canvas.addEventListener("mousemove", mouseMoveHandler, false);
    
    region = new JSTerrain.Region(gl, new Uint16Array(256 * 256), true);
    
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
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indices[0], gl.STATIC_DRAW);
    } catch(e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function initShaders() {
    // Vertex shader
    vert_src = "attribute vec3 pos;\n\nuniform mat4 matp;\nuniform mat4 matmv;\n\nvoid main(void) {\ngl_Position = matp * matmv * vec4(pos.x, pos.y, pos.z, 1.0);\n}";
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
