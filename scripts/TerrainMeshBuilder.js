/*  *****************************************************************

    TerrainMeshBuilder.js

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
import { getTerrainZone } from "./TerrainZone.js";

const CELL_SHAPE_FLAT = 0;
const CELL_SHAPE_SLOPE = 1;
const CELL_SHAPE_CORNER_UP = 2;
const CELL_SHAPE_CORNER_DOWN = 3;

export class TerrainMeshBuilder {

    constructor() {

    }

    build(width, terrain) {

        const cells = terrain.cells;
        const timeStart = performance.now();

        if (!width || isNaN(width)) {
            throw new Error("(TerrainMeshBuilder.build) The parameter 'width'"
                + "must be supplied, and it must be a number.");
        }
        if (!cells
            || !Array.isArray(cells)
            || cells.length != width * width) {
            throw new Error("(TerrainMeshBuilder.build) The parameter"
                + "'cellInfo' must be supplied, and it must be an array whose "
                + " length is the square of the 'width' parameter.");
        }

        const vertices = [];

        // Each cell's corners must be different vertices from the corners
        // of the neighboring cells, to allow for different UV mappings.  As 
        // a side effect, we'll have to compute our own normals.
        const computeFaceNormal = (p0, p1, p2) => {
            const a = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
            const b = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
            const s = [
                a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]
            ];
            const l = Math.sqrt(
                s[0] * s[0]
                + s[1] * s[1]
                + s[2] * s[2]);
            return [s[0] / l, s[1] / l, s[2] / l];
        };

        const rotateAroundByTurns = (v, turns, vAround) => {
            const angle = turns * -90 * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            // Translate relative to origin
            const v_t = [v[0] - vAround[0], v[1] - vAround[1]];
            // rotate
            const v_r = [
                cos * v_t[0] - sin * v_t[1],
                cos * v_t[1] + sin * v_t[0]
            ];
            // Translate back
            const v_f = [v_r[0] + vAround[0], v_r[1] + vAround[1]];
            return v_f;
        };

        cells.forEach((cell, i) => {

            // Calculate the x- and z-positions of the top-left corner
            // of the cell
            const z = Math.trunc(i / width);
            const x = Math.trunc(i % width);

            // Get the height of the current cell and its neighbors.  If the
            // cell is at the edge of the map, extend the current cell's 
            // height into the undefined area.

            // The cell's height is its lowest height; slopes are determined 
            // by the neighboring cells.
            //
            //     |   |___    In this example, the two cells on the left 
            //     |  /|       both have height n, and the cell on the right
            //     | / |       has height n+1.  The cell in the middle becomes
            //  ___|/  |       a slope by being in between the n-height cell 
            //   n   n  n+1    and the n+1-height cell.

            // Center vertex
            let yE = cell.elevation;
            // Upper left
            let yA = (x > 0 && z > 0)
                ? cells[i - width - 1].elevation : yE;
            // Upper
            const yTop = (z > 0) ? cells[i - width].elevation : yE;
            // Upper right
            let yB = (x < (width - 1) && z > 0)
                ? cells[i - width + 1].elevation : yE;
            // Right
            const yRight = (x < (width - 1)) ? cells[i + 1].elevation : yE;
            // Bottom right
            let yC = (x < (width - 1) && z < (width - 1))
                ? cells[i + width + 1].elevation : yE;
            // Bottom
            const yBot = (z < (width - 1)) ? cells[i + width].elevation : yE;
            // Bottom left
            let yD = (x > 0 && z < (width - 1))
                ? cells[i + width - 1].elevation : yE;
            // Left
            const yLeft = (x > 0)
                ? cells[i - 1].elevation : yE;

            // Do we have any higher corners?  (Remember that lower corners 
            // don't matter here, because they don't determine the shape of 
            // this cell.)
            const higherCorners = [yA, yB, yC, yD]
                .map((cur, curIx) => cur > yE ? curIx : undefined)
                .filter((cur) => !isNaN(cur));
            const higherSides = [yLeft, yTop, yRight, yBot]
                .map((cur, curIx) => cur > yE ? curIx : undefined)
                .filter((cur) => !isNaN(cur));

            let cellShape = CELL_SHAPE_FLAT;

            // 'cellTurns' is the number of clockwise 90-degree turns
            // needed to get the cell into the correct orientation, 
            // relative to the normal map.
            let cellTurns = 0;

            let uvOffset = [0, 0.5];

            if (higherSides.length == 0) {
                if (higherCorners.length == 1) {
                    cellShape = CELL_SHAPE_CORNER_UP;
                    cellTurns = (higherCorners[0] * -1) % 4;
                    // Correct values obtained from corner neighbors to 
                    // correspond to sides.
                    yA = higherCorners.includes(0) ? yA : yE;
                    yB = higherCorners.includes(1) ? yB : yE;
                    yC = higherCorners.includes(2) ? yC : yE;
                    yD = higherCorners.includes(3) ? yD : yE;
                    uvOffset = [0.5, 0.5];
                }
                else {
                    cellShape = CELL_SHAPE_FLAT;
                    // We've determined that the cell should be flat, so 
                    // we have to remove the influence that a lower corner
                    // might have had when setting the heights.
                    yA = yB = yC = yD = yE;
                    uvOffset = [0, 0];
                }
            }
            else if (higherSides.length == 1) {
                cellShape = CELL_SHAPE_SLOPE;
                // Heights obtained from corners have to be replaced with new
                // heights obtained from the higher side.
                switch (higherSides[0]) {
                    case 0:
                        yA = yD = yLeft;
                        break;
                    case 1:
                        yB = yA = yTop;
                        break;
                    case 2:
                        yC = yB = yRight;
                        break;
                    case 3:
                        yD = yC = yBot;
                }
                // cellTurns = (higherSides[0] - 1) % 4;
                cellTurns = [1, 0, 3, 2][higherSides[0]];
                // For slope cells, we have to lift E to the halfway point
                yE += 0.5;
                uvOffset = [0, 0.5];
            }
            else if (higherSides.length == 2) {
                cellShape = CELL_SHAPE_CORNER_DOWN;
                // We have to replace the corner heights with the heights from
                // the higher sides.
                const highSide = Math.max(yLeft, yTop, yRight, yBot);
                if (higherSides.includes(0)) {
                    yD = yA = yE = highSide;
                }
                if (higherSides.includes(1)) {
                    yA = yB = yE = highSide;
                }
                if (higherSides.includes(2)) {
                    yB = yC = yE = highSide;
                }
                if (higherSides.includes(3)) {
                    yD = yC = yE = highSide;
                }
                uvOffset = [0.5, 0.0];
                if (!higherSides.includes(0)) {
                    if (!higherSides.includes(1)) {
                        cellTurns = 2;
                    }
                    else {
                        cellTurns = -1;
                    }
                }
                else {
                    if (!higherSides.includes(1) && !higherSides.includes(2)) {
                        cellTurns = 1;
                    }
                }
            }

            cell.shape = cellShape;

            // Adjust heights
            yA /= Math.SQRT2;
            yB /= Math.SQRT2;
            yC /= Math.SQRT2;
            yD /= Math.SQRT2;
            yE /= Math.SQRT2;

            const rawColor = getTerrainZone(
                Math.min(
                    3,
                    Math.round(
                        (cell.elevation - terrain.minElev)
                        / (terrain.maxElev - terrain.minElev) * 4)),
                cell.moisture
            ).color;
            const color = [
                ((rawColor & 0xff0000) >>> 0x10) / 255.0,
                ((rawColor & 0x00ff00) >>> 0x8) / 255.0,
                ((rawColor & 0x0000ff)) / 255.0,
            ];

            // Create a vertex for each of the four corners of the cell
            // (named 'A'-'D', clockwise from top left), as well as the 
            // center of the cell ('E').
            const vertA = {
                pos: [x - 0.5, yA, z - 0.5],
                norm: [0, 0, 0],
                color: color,
                uv: rotateAroundByTurns(
                    [uvOffset[0], uvOffset[1] + 0.5],
                    cellTurns,
                    [uvOffset[0] + 0.25, uvOffset[1] + 0.25]
                )
            };
            const vertB = {
                pos: [x + 0.5, yB, z - 0.5],
                norm: [0, 0, 0],
                color: color,
                uv: rotateAroundByTurns(
                    [uvOffset[0] + 0.5, uvOffset[1] + 0.5],
                    cellTurns,
                    [uvOffset[0] + 0.25, uvOffset[1] + 0.25])
            };
            const vertC = {
                pos: [x + 0.5, yC, z + 0.5],
                norm: [0, 0, 0],
                color: color,
                uv: rotateAroundByTurns(
                    [uvOffset[0] + 0.5, uvOffset[1]],
                    cellTurns,
                    [uvOffset[0] + 0.25, uvOffset[1] + 0.25])
            };
            const vertD = {
                pos: [x - 0.5, yD, z + 0.5],
                norm: [0, 0, 0],
                color: color,
                uv: rotateAroundByTurns(
                    [uvOffset[0], uvOffset[1]],
                    cellTurns,
                    [uvOffset[0] + 0.25, uvOffset[1] + 0.25])
            };
            const vertE = {
                pos: [x, yE, z],
                norm: [0, 0, 0],
                color: color,
                uv: [uvOffset[0] + 0.25, uvOffset[1] + 0.25]
            };

            // Allowing the BufferGeometry to operate in non-indexed mode,
            // the three preceding points will form a triangle.  In this 
            // particular use scenario, non-indexed mode and separated 
            // triangles will offer some benefits for shading and texture
            // mapping, at the cost of some memory.

            // Add the vertices in order, creating the four triangles.
            const fnEBA = computeFaceNormal(vertE.pos, vertB.pos, vertA.pos);
            vertices.push(...[
                { ...vertE, norm: fnEBA },
                { ...vertB, norm: fnEBA },
                { ...vertA, norm: fnEBA },
            ]);

            const fnECB = computeFaceNormal(vertE.pos, vertC.pos, vertB.pos);
            vertices.push(...[
                { ...vertE, norm: fnECB },
                { ...vertC, norm: fnECB },
                { ...vertB, norm: fnECB },
            ]);

            const fnEDC = computeFaceNormal(vertE.pos, vertD.pos, vertC.pos);
            vertices.push(...[
                { ...vertE, norm: fnEDC },
                { ...vertD, norm: fnEDC },
                { ...vertC, norm: fnEDC },
            ]);

            const fnEAD = computeFaceNormal(vertE.pos, vertA.pos, vertD.pos);
            vertices.push(...[
                { ...vertE, norm: fnEAD },
                { ...vertA, norm: fnEAD },
                { ...vertD, norm: fnEAD },
            ]);

        }); // end of cells loop

        const positions = [];
        const normals = [];
        const uvs = [];
        const colors = [];
        for (const vert of vertices) {
            positions.push(...vert.pos);
            normals.push(...vert.norm);
            uvs.push(...vert.uv);
            colors.push(...vert.color);
        }

        const geom = new THREE.BufferGeometry();
        const positionNumComponents = 3;
        const normalNumComponents = 3;
        const uvNumComponents = 2;
        const colorNumComponents = 3;
        geom.setAttribute(
            "position",
            new THREE.BufferAttribute(
                new Float32Array(positions), 
                positionNumComponents));
        geom.setAttribute(
            "normal",
            new THREE.BufferAttribute(
                new Float32Array(normals), 
                normalNumComponents));
        geom.setAttribute(
            "uv",
            new THREE.BufferAttribute(
                new Float32Array(uvs), 
                uvNumComponents));
        geom.setAttribute(
            "color",
            new THREE.BufferAttribute(
                new Float32Array(colors), 
                colorNumComponents));

        console.log(
            "(TerrainGenerator.generate) executed in " +
            `${performance.now() - timeStart} ms.`
        );

        geom.translate(-32, 0, -32);

        return geom;
    }
}


