var JSTerrain = {
    init: function(gl) {
        // Set GL context
        JSTerrain.glContext = gl;
        
        // Load indices
        JSTerrain.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, JSTerrain.indices, gl.STATIC_DRAW);
    },
    
    Region: function(heightArray, readOnly) {
        this.heightArray = heightArray;
        this.readOnly = readOnly;
        this.dirty = false;
        
        // Chunk tree data structure
        function ChunkTreeData() {
            this.excluded = false;
            this.minHeight = 0;
            this.maxHeight = 0;
        }
        
        // Fill chunk tree
        var chunkCount = 256 + 64 + 16 + 4 + 1;
        this.chunkTree = new Array(chunkCount);
        for (var chunk = 0; chunk < chunkCount; chunk++) {
            this.chunkTree[chunk] = new ChunkTreeData();
        }
        
        /* TODO: CREATE THESE FUNCTIONS
         * pushToGPU - Creates/updates VBO with current data
         * deleteFromGPU - Deletes the VBO
         * isOnGPU - Returns true if the region has a VBO
         */
        
        // Create WebGL vertex buffers
        var gl = JSTerrain.glContext;
        this.vertexBuffers = [gl.createBuffer(), gl.createBuffer()];
        
        var tempVertexArray = new Float32Array(2 * 257 * 129);
        for (var vb = 0; vb < 2; vb++) {
            // Create data
            for (var vertexX = 0; vertexX < 257; vertexX++) {
                for (var vertexY = 0; vertexY < 129; vertexY++) {
                    var vertex = vertexY * 257 + vertexX;
                    tempVertexArray[vertex * 2 + 0] = (vertexY + 128 * vb) * 257 + vertexX;
                    tempVertexArray[vertex * 2 + 1] = this.heightArray[vertex + 32896 * vb];
                }
            }
            
            // Load data into WebGL
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[vb]);
            gl.bufferData(gl.ARRAY_BUFFER, tempVertexArray, gl.STATIC_DRAW);
        }
        
        // Index buffering
        this.indices = undefined;
        this.indexBuffer = undefined;
    },
    
    RenderStruct: function() {
        this.chunkID = 0;
        this.morph = 0;
        this.edgeMorph = {n: 0, e: 0, s: 0, w: 0};
    },
    
    RenderVariables: function() {
        this.region = null;
        this.eyePosition = {x: 0, y: 0, z: 0};
        this.LODDistances = [0, 0, 0, 0, 0];
        this.morphEnabled = false;
        this.clipPlanes = undefined;
        this.LODMap = new Uint8Array(16 * 16);
        this.renderStack = new Array(256);
        this.renderStackSize = 0;
        for (var renderStruct = 0; renderStruct < 256; renderStruct++) {
            this.renderStack[renderStruct] = new JSTerrain.RenderStruct();
        }
    },
    
    getDistanceToChunkSquared: function(region, chunkID, eyePosition) {
        // Get chunk bounding box
        var chunkConstant = JSTerrain.chunkConstants[chunkID];
        var min = {x: chunkConstant.min.x, y: chunkConstant.min.y, z: 0};
        var max = {x: chunkConstant.max.x, y: chunkConstant.max.y, z: 0};
        if (region) {
            max.z = region.chunkTree[chunkID].maxHeight;
            min.z = region.chunkTree[chunkID].minHeight;
        }
        
        // Get X distance
        var diff = {x: 0, y: 0, z: 0};
        if (min.x > eyePosition.x) {
            diff.x = min.x - eyePosition.x;
        } else if (max.x < eyePosition.x) {
            diff.x = eyePosition.x - max.x;
        }
        
        // Get Y distance
        if (min.y > eyePosition.y) {
            diff.y = min.y - eyePosition.y;
        } else if (max.y < eyePosition.y) {
            diff.y = eyePosition.y - max.y;
        }
        
        // Get Z distance
        if (min.z > eyePosition.z) {
            diff.z = min.z - eyePosition.z;
        } else if (max.z < eyePosition.z) {
            diff.z = eyePosition.z - max.z;
        }
        
        // Get the distance
        return diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;
    },
    
    renderRegion: function(renderVariables) {
        function renderRecurse(renderVariables, level, chunkID) {
            function drawChunk(renderVariables, chunkID, morph) {
                // Add to render stack
                if (renderVariables.renderStackSize < 256) {
                    renderVariables.renderStack[renderVariables.renderStackSize].chunkID = chunkID;
                    renderVariables.renderStack[renderVariables.renderStackSize].morph = morph;
                    renderVariables.renderStackSize++;
                    
                    // Edge morph
                    var variableLodEdges = JSTerrain.chunkConstants[chunkID].variableLodEdges;
                    var borderEdges = JSTerrain.chunkConstants[chunkID].variableLodEdges;
                    if ((variableLodEdges & 0x1) && !(borderEdges & 0x1)) { // NORTH
                        
                    } else {
                        renderVariables.renderStack[renderVariables.renderStackSize].edgeMorph.n = 0;
                    }
                    if ((variableLodEdges & 0x2) && !(borderEdges & 0x2)) { // EAST
                        
                    } else {
                        renderVariables.renderStack[renderVariables.renderStackSize].edgeMorph.e = 0;
                    }
                    if ((variableLodEdges & 0x4) && !(borderEdges & 0x4)) { // SOUTH
                        
                    } else {
                        renderVariables.renderStack[renderVariables.renderStackSize].edgeMorph.s = 0;
                    }
                    if ((variableLodEdges & 0x5) && !(borderEdges & 0x8)) { // WEST
                        
                    } else {
                        renderVariables.renderStack[renderVariables.renderStackSize].edgeMorph.w = 0;
                    }
                }
            }
            
            function renderQuadrant(renderVariables, level, chunkID) {
                // Check if excluded
                if (renderVariables.region && renderVariables.region.chunkTree[chunkID].excluded == true) {
                    return;
                }
                
                renderRecurse(renderVariables, level, chunkID);
            }
            
            
            // Get distance to eye
            var distanceToChunkSquared = JSTerrain.getDistanceToChunkSquared(renderVariables.region, chunkID, renderVariables.eyePosition);
            
            // Calculate morph
            var morph = 0;
            if (renderVariables.morphEnabled == true) {
                var morphStart = renderVariables.LODDistances[level];
                var morphEnd = renderVariables.LODDistances[level] + JSTerrain.LODSize[level];
                morphStart *= morphStart;
                morphEnd *= morphEnd;
                
                if (distanceToChunkSquared > morphStart) {
                    morph = (distanceToChunkSquared - morphStart) / (morphEnd - morphStart);
                    if (morph > 1.0) {
                        morph = 1.0;
                    }
                }
            }
            
            // Draw this chunk if it is on the bottom level
            if (level == 0) {
                drawChunk(renderVariables, chunkID, morph);
                return;
            }
            
            // Check if this chunk is further away than the below LOD distance
            var LODDistance = renderVariables.LODDistances[level - 1] + JSTerrain.LODSize[level - 1];
            LODDistance *= LODDistance;
            if (distanceToChunkSquared > LODDistance) {
                drawChunk(renderVariables, chunkID, morph);
                return;
            }
            
            // Work out which chunk the eye is in
            var eyePos = renderVariables.eyePosition;
            var chunkCentre = JSTerrain.chunkConstants[chunkID].centre;
            var eyeChunk = 0;
            if (eyePos.x > chunkCentre.x) {
                eyeChunk += 1;
            }
            if (eyePos.y > chunkCentre.y) {
                eyeChunk += 2;
            }
            
            // Render each quadrant furthest from the eye first
            switch (eyeChunk) {
                case 0: // 4, 3, 2, 1
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 4);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 3);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 2);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 1);
                break;
                case 1: // 3, 4, 1, 2
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 3);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 4);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 1);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 2);
                break;
                case 2: // 2, 1, 4, 3
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 2);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 1);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 4);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 3);
                break;
                case 3: // 1, 2, 3, 4
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 1);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 2);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 3);
                    renderQuadrant(renderVariables, level - 1, chunkID * 4 + 4);
                break;
            }
        }
        
        // Start recursing through region
        renderRecurse(renderVariables, 4, 0);
    }
};
