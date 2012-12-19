var region;
var canvas;
var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var heightTexture;
var heightImage;
var colourTexture;
var colourImage;

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
        //mat4.ortho(0, 1024, 768, 0, 0.1, 1000.0, pMatrix);
        mat4.perspective(90, 1024 / 768, 0.1, 1000.0, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.pUniform, false, pMatrix);
        
        // Model view matrix
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [0, 0, -100]);
        mat4.scale(mvMatrix, [2.0, 2.0, 1.0])
        mat4.scale(mvMatrix, [1.0, -1.0, 1]);
        mat4.rotateX(mvMatrix, 0.8, mvMatrix);
        mat4.translate(mvMatrix, [-100, -200, -100]);
        mat4.scale(mvMatrix, [1.0, 1.0, 50]);
        gl.uniformMatrix4fv(shaderProgram.mvUniform, false, mvMatrix);
        
        // Bind buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, JSTerrain.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 2, gl.UNSIGNED_SHORT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indexBuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, heightTexture);
        gl.uniform1i(shaderProgram.heightsUniform, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, colourTexture);
        gl.uniform1i(shaderProgram.coloursUniform, 1);
        
        // Draw render stack
        var currentVB = -1;
        for (var renderStruct = renderVariables.renderStackSize - 1; renderStruct >= 0; renderStruct--) {
            var chunkID = renderVariables.renderStack[renderStruct].chunkID;
            
            // Set uniforms for this chunk
            gl.uniform1f(shaderProgram.sizeUniform, JSTerrain.chunkConstants[chunkID].size / 16);
            gl.uniform2fv(shaderProgram.chunkPosUniform, [JSTerrain.chunkConstants[chunkID].min.x, JSTerrain.chunkConstants[chunkID].min.y]);
            
            // Draw chunk
            gl.drawElements(gl.TRIANGLES, 1536, gl.UNSIGNED_SHORT, 0);
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
    
    heightTexture = gl.createTexture();
    heightImage = new Image();
    heightImage.onload = function() { handleTextureLoaded(heightImage, heightTexture); }
    heightImage.src = "data/map.png";
    
    colourTexture = gl.createTexture();
    colourImage = new Image();
    colourImage.onload = function() { handleTextureLoaded(colourImage, colourTexture); }
    colourImage.src = "data/texture.png";
    
    /*
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
    */
    
    // Create region
    region = new JSTerrain.Region();
    
    // Start main loop
    setInterval(draw, 30);
}


// Borrowed from: https://developer.mozilla.org/en-US/docs/WebGL/Using_textures_in_WebGL :)
function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
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
    vert_src = "attribute vec2 pos;\n\nuniform mat4 matp;\nuniform sampler2D heights;\n\nuniform float size; uniform vec2 chunkPos;\nuniform mat4 matmv;\nvarying vec2 pointPos;\nvoid main(void) {\npointPos = chunkPos + pos * size;\ngl_Position = matp * matmv * vec4(pointPos.x, pointPos.y, texture2D(heights, pointPos / 257.0).r, 1.0);\n}";
    
    
    var vert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert, vert_src);
    gl.compileShader(vert);
    if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(vert));
        return null;
    }
    
    // Fragment shader
    frag_src = "precision mediump float;\nuniform sampler2D colours;\nvarying vec2 pointPos;\n\nvoid main(void) {\ngl_FragColor = texture2D(colours, pointPos / 257.0);\n}";
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
    
    prog.heightsUniform = gl.getUniformLocation(prog, "heights");
    prog.coloursUniform = gl.getUniformLocation(prog, "colours");
    
    prog.sizeUniform = gl.getUniformLocation(prog, "size");
    prog.chunkPosUniform = gl.getUniformLocation(prog, "chunkPos");
    
    return prog;
}
