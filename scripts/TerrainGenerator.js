/*  *****************************************************************

    TerrainGenerator.html

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

import * as perlinNoise from "@leodeslf/perlin-noise";
// import { TerrainType, TerrainUOffsets } from "./terrain_type.js";

// Generate a flat array of 4,096 (64 x 64) height values and
// fill it using Perlin noise.  This is only to generate data
// for purposes of this demo, and it is not a part of the
// answer to the problem as described.

// const NOISE_SEED = 0;
const DEFAULT_WIDTH = 64;
const DEFAULT_RES = 0.1;
const DEFAULT_AMPLITUDE = 15;

/**
 * Describes a cell of the terrain
 * @typedef CellInfo
 * @property {number} elevation The elevation of the cell
 * @property {number} moisture  The moisture level of the cell
 * @property {xIndex} xIndex    The x-index of the cell
 * @property {zIndex} zIndex    The z-index of the cell
 * @property {shape}  shape     The shape of the cell (flat, sloped, etc.)
 * @property {facing} facing    The facing of the cell
 */

/**
 * Describes the complete terrain
 * @typedef Terrain
 * @property {number} maxElev The maximum elevation of the cells in the terrain
 * @property {number} minElev The minimum elevation of the cells in the terrain
 * @property {CellInfo[]} cells The cells in the terrain, in a flat array of 
 * size width * width.
 */

export class TerrainGenerator {

    constructor(width, amplitude, resolution) {

        this.width = (width && !isNaN(width)) ? width : DEFAULT_WIDTH;
        this.area = this.width * this.width;
        this.amplitude = (amplitude && !isNaN(amplitude))
            ? amplitude : DEFAULT_AMPLITUDE;
        this.frequency = (resolution && !isNaN(resolution))
            ? resolution : DEFAULT_RES;
    }

    noise(x, y) {
        x = (x && !isNaN(x)) ? x : 0;
        y = (y && !isNaN(y)) ? y : 0;
        return perlinNoise.perlin2D(x, y);
    }

    generate() {
        const timeStart = performance.now();

        // Generate Perlin noise as the basis for the terrain
        let cellInfo = Array(this.area);
        let elevRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
        for (let i = 0; i < this.area; i++) {
            const x = i % this.width;
            const z = Math.trunc(i / this.width);
            const rawY = this.noise(
                13 + x / 32,
                23 + z / 32);
            let y = Math.trunc(
                Math.floor(this.amplitude / 2)
                * rawY);

            // Cap elevation difference versus neighbors.
            const neighbors = [];
            // left neighbor
            if (x > 0) {
                neighbors.push(cellInfo[i - 1].elevation);
                // up/left neighbor
                if (z > 0) {
                    neighbors.push(cellInfo[i - (this.width + 1)].elevation);
                }
            }
            // up neighbor
            if (z > 0) {
                neighbors.push(cellInfo[i - this.width].elevation);
                // up/right neighbor
                if (x < this.width - 1) {
                    neighbors.push(cellInfo[(i - this.width) + 1].elevation);
                }
            }
            if (neighbors.length) {
                const neighborRange = [
                    Math.min(...neighbors),
                    Math.max(...neighbors)
                ];
                if (neighborRange[1] - neighborRange[0] > 2) {
                    // This should never happen, because any cells that 
                    // are already in cellInfo have already been through 
                    // this smoothing process.
                    throw new Error("(TerrainGenerator.generate) The range "
                        + "around a cell is too great.");
                }
                // We know that the highest and lowest neighbors are at most 
                // two elevation levels apart.  Therefore, the cell we're 
                // working on can be at most one level below the highest 
                // neighbor and one level above the lowest.
                y = y < neighborRange[0] + 1 ? y : neighborRange[0] + 1;
                y = y > neighborRange[1] - 1 ? y : neighborRange[1] - 1;
            }

            elevRange[0] = y < elevRange[0] ? y : elevRange[0];
            elevRange[1] = y > elevRange[1] ? y : elevRange[1];

            let moisture = Math.trunc(
                6 * (this.noise(z * 0.15, x * 0.15) + 1) / 2
            );
            moisture = moisture <= 5 ? moisture : 5;

            cellInfo[i] = {
                "elevation": y,
                "moisture": moisture,
                "xIndex": x,
                "zIndex": z,
                "shape": 0,
                "facing": 0
            };
        }
        const result = {
            cells: cellInfo,
            minElev: elevRange[0],
            maxElev: elevRange[1]
        };

        const timeEnd = performance.now();
        console.log(
            "(TerrainGenerator.generate) executed in " +
            `${timeEnd - timeStart} ms.`
        );

        return result;
    }
}
