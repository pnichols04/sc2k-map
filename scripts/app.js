/*  *****************************************************************

    app.js

    Part of SC2K-style Terrain Renderer
    Demo: https://pnichols04.github.io/sc2k-map/
    Repo: https://github.com/pnichols04/sc2k-map

    Copyright © 2022 Philip Nichols

    Made available under the MIT License:

    Permission is hereby granted, free of charge, to any person 
    obtaining a copy of this software and associated documentation 
    files (the “Software”), to deal in the Software without 
    restriction, including without limitation the rights to use, 
    copy, modify, merge, publish, distribute, sublicense, and/or 
    sell copies of the Software, and to permit persons to whom the 
    Software is furnished to do so, subject to the following 
    conditions:

    The above copyright notice and this permission notice shall be 
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, 
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
    OTHER DEALINGS IN THE SOFTWARE.

    -----------------------------------------------------------------

    Attribution, as well as notice of any use, is requested but not 
    required.

**********************************************************************  */

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { TerrainGenerator } from "./TerrainGenerator.js";
import { TerrainMeshBuilder } from "./TerrainMeshBuilder.js";

/**
 * @typedef {import('./TerrainGenerator.js').CellInfo} CellInfo
 * @typedef {import('./TerrainGenerator.js').Terrain} Terrain
 */

const WIDTH = 64;
const TEXTURE_URL = "./../img/terrain_pix_dif.png";
const RENDER_CANVAS_ID = "render-canvas";
const ELEV_MAP_ID = "elev-map";
const MOISTURE_MAP_ID = "moisture-map";


/** Entry point for the SC2K-style Terrain Renderer */
export class App {

    /**
     * Creates an App
     * @param {number} width The width (also height) of the map to be generated.
     */
    constructor(width = WIDTH) {
        if (width) {
            console.assert(
                !isNaN(width),
                "If the 'width' parameter is specified, it must be a number. "
                + "(Alternatively, the parameter can be omitted, and the "
                + `default value of ${WIDTH} will be used.)`);
        }
        this.width = width;
        this.tg = new TerrainGenerator();
        this.terrain = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.tmb = new TerrainMeshBuilder();
    }

    run() {
        const appInstance = this;

        this.generateTerrain();
        this.generateMapPreviews();
        this.initScene();
        this.initCamera();
        this.initLights();
        this.initTerrainMesh();
        this.initRenderer();
        this.initControls();
        this.renderer.setAnimationLoop(() => {
            console.log("Loop");
            this.resizeRendererToCanvas(appInstance.renderer);
            this.renderer.render(appInstance.scene, appInstance.camera);
        });
    }

    generateTerrain() {
        this.terrain = this.tg.generate(this.width);
    }

    generateMapPreviews() {
        const elevBuffer = new Uint8ClampedArray(WIDTH * WIDTH * 4);
        const moistureBuffer = new Uint8ClampedArray(WIDTH * WIDTH * 4);
        const elevDelta = this.terrain.maxElev - this.terrain.minElev;

        // Build the preview maps into buffers
        this.terrain.cells.forEach((cell, i) => {
            const elevNorm = Math.round((
                (cell.elevation - this.terrain.minElev) / elevDelta
            ) * 255);
            const j = i * 4;

            elevBuffer[j] = elevNorm;
            elevBuffer[j + 1] = elevNorm;
            elevBuffer[j + 2] = elevNorm;
            elevBuffer[j + 3] = 255;

            const m = cell.moisture;
            moistureBuffer[j] = 255 * (m / 4);
            moistureBuffer[j + 1] = 255 * (m / 4);
            moistureBuffer[j + 2] = 255 * (m / 4);
            moistureBuffer[j + 3] = 255;
        });

        // Create an off-screen canvas to convert the elevation map 
        // into a PNG.
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = WIDTH;
        const ctx = canvas.getContext("2d");
        let idata = ctx.createImageData(WIDTH, WIDTH);

        idata.data.set(elevBuffer);
        ctx.putImageData(idata, 0, 0);
        let dataUri = canvas.toDataURL(); // produces a PNG file
        document.getElementById(ELEV_MAP_ID).src = dataUri;

        // Repeat for the moisture buffer
        idata.data.set(moistureBuffer);
        ctx.putImageData(idata, 0, 0);
        dataUri = canvas.toDataURL(); // produces a PNG file
        document.getElementById(MOISTURE_MAP_ID).src = dataUri;
    }

    initScene() {
        this.scene = new THREE.Scene();
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            window.innerWidth / window.innerHeight, // aspect
            0.1, // near clipping distance
            1000 // far clipping distance
        );
        this.camera.position.set(0, 27.71, 0);
        this.camera.lookAt(0, 32, 0);
        this.scene.add(this.camera);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.domElement.id = RENDER_CANVAS_ID;
        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
        document.body.appendChild(this.renderer.domElement);
    }

    initTerrainMesh() {
        const geom = this.tmb.build(this.width, this.terrain);

        // Create the material
        const loader = new THREE.TextureLoader();
        const terrainDiff = loader.load(TEXTURE_URL);
        const terrainMat = new THREE.MeshPhongMaterial({
            map: terrainDiff,
            vertexColors: THREE.VertexColors
        });

        // Bind the mesh to the scene
        const terrainMesh = new THREE.Mesh(geom, terrainMat);
        this.scene.add(terrainMesh);
    }

    initLights() {
        const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 50, 0 );
        this.scene.add( hemiLight );

        const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( - 1, 1.75, 1 );
        dirLight.position.multiplyScalar( 30 );
        this.scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
    }

    resizeRendererToCanvas(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        return needResize;
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    animate() {
        this.resizeRendererToCanvas(this.renderer);
        this.renderer.render(this.scene, this.camera);
    }

}
