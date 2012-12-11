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
    if (mouse.changed) {
        mouse.changed = false;
        
        var renderVariables = new JSTerrain.RenderVariables();
        renderVariables.region = region;
        renderVariables.LODDistances = [32, 128, 256, 512, 1024];
        renderVariables.morphEnabled = true;
        renderVariables.eyePosition = {x: mouse.x / 3, y: mouse.y / 3, z: 0}
        
        JSTerrain.renderRegion(renderVariables);
        
        var currentVB = -1;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //mat4.perspective(90, 1024 / 768, 0.1, 1000.0, pMatrix);
        mat4.ortho(0, 1024, 768, 0, 1, 1000, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.pUniform, false, pMatrix);
        
        // Bind indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indexBuffer);
        
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
                gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
                currentVB = vb;
            }
            
            mat4.identity(mvMatrix);
            mat4.scale(mvMatrix, [3.0, 3.0, 1.0]);
            mat4.translate(mvMatrix, [0, 0, -10]);
            gl.uniformMatrix4fv(shaderProgram.mvUniform, false, mvMatrix);
            
            // Draw chunk
            gl.drawElements(gl.LINE_STRIP, 1536, gl.UNSIGNED_SHORT, startIndex * 2);
        }
    }
}

function start() {
    canvas = document.getElementById("game");
    initGL(canvas);
    shaderProgram = initShaders();
    
    canvas.addEventListener("mousemove", mouseMoveHandler, false);
    
    JSTerrain.init(gl);
    region = new JSTerrain.Region(new Uint16Array(257 * 257), true);
    
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
