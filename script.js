let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
drawBackground();

let forceInput = document.getElementById('forceInput');
let refinementInput = document.getElementById('refinementInput');

// to sum reaction at same point
let vertexReactions = {};

canvas.addEventListener('click', function(event) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    let force = parseFloat(forceInput.value);
    let refinement = parseInt(refinementInput.value);

    let truss = generateFractalTruss(x, y, refinement);
    let stresses = calculateStresses(truss, force);



    vertexReactions = {};  // Reset reactions for each click
    drawTruss(truss, stresses);
    drawForceArrow(x, y, force);

    // Draw summed reactions after processing all triangles
    for (let key in vertexReactions) {
        let [vx, vy] = key.split(',').map(Number);
        drawReactionArrow(vx, vy, vertexReactions[key]);
    }

    drawLegend(stresses);
    
});

function generateFractalTruss(x, y, depth) {
    let triangles = [];

    function recursiveTriangle(x1, y1, x2, y2, x3, y3, depth) {
        if (depth === 0) {
            triangles.push({ x1, y1, x2, y2, x3, y3 });
            return;
        }

        // Calculate midpoints with some randomness for variety
        let mx1 = (x1 + x2) / 2 + (Math.random() - 0.5) * 10;
        let my1 = (y1 + y2) / 2 + (Math.random() - 0.5) * 10;

        let mx2 = (x2 + x3) / 2 + (Math.random() - 0.5) * 10;
        let my2 = (y2 + y3) / 2 + (Math.random() - 0.5) * 10;

        let mx3 = (x1 + x3) / 2 + (Math.random() - 0.5) * 10;
        let my3 = (y1 + y3) / 2 + (Math.random() - 0.5) * 10;

        // Split the triangle into smaller triangles and recurse
        recursiveTriangle(x1, y1, mx1, my1, mx3, my3, depth - 1);
        recursiveTriangle(x2, y2, mx1, my1, mx2, my2, depth - 1);
        recursiveTriangle(x3, y3, mx2, my2, mx3, my3, depth - 1);
        recursiveTriangle(mx1, my1, mx2, my2, mx3, my3, depth - 1);
    }

    let size = canvas.height * 0.8 - y;
    let halfSize = size / 2;

    // Adjust starting points for the top triangles to coincide with the click point
    recursiveTriangle(x, y, x - halfSize, y + size, x + halfSize, y + size, depth);
    return triangles;
}


function computeReactions(truss, externalForce) {
    // This function will compute reactions using the Joint Method

    let reactions = [];
    let totalForce = externalForce;
    let groundVertices = [];  // To store vertices touching the ground

    let groundY = canvas.height * 0.8;

    // Identify vertices touching the ground and initialize their reactions to zero
    truss.forEach((triangle) => {
        let vertices = [
            { x: triangle.x1, y: triangle.y1 },
            { x: triangle.x2, y: triangle.y2 },
            { x: triangle.x3, y: triangle.y3 }
        ];

        vertices.forEach(vertex => {
            if (Math.abs(vertex.y - groundY) < 5) {  // 5 is a tolerance value
                let key = `${vertex.x},${vertex.y}`;
                if (!groundVertices.includes(key)) {
                    groundVertices.push(key);
                    reactions[key] = 0;
                }
            }
        });
    });

    // Distribute the external force among the ground vertices
    let distributedForce = totalForce / groundVertices.length;
    groundVertices.forEach(key => {
        reactions[key] = distributedForce;
    });

    return reactions;
}




function calculateStresses(truss, force) {
    let stresses = [];
    let maxY = Math.max(...truss.map(t => Math.max(t.y1, t.y2, t.y3))); // Get the Y position of the furthest triangle from the point of force application
    truss.forEach(t => {
        let distanceFromForce = maxY - t.y1; // Assuming force is applied at the top of the first layer of triangles
        let stress = force * distanceFromForce / maxY;
        stresses.push(stress);
    });
    return stresses;
}

function drawForceArrow(x, y, force) {
    let arrowLength = 30;
    let arrowHeadLength = 10;
    let arrowHeadWidth = 5;

    // Draw the arrow line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - arrowLength);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - arrowHeadWidth, y - arrowLength + arrowHeadLength);
    ctx.lineTo(x + arrowHeadWidth, y - arrowLength + arrowHeadLength);
    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();

    // Display the force value and unit
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = 'black';
    ctx.fillText(`${force} N`, x, y - arrowLength - 5);
}

function drawReactionArrow(x, y, force) {
    let arrowLength = 30; // Adjust as needed
    let arrowHeadLength = 10;
    let arrowHeadWidth = 5;

    // Draw the arrow line pointing upwards
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + arrowLength);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - arrowHeadWidth, y + arrowLength - arrowHeadLength);
    ctx.lineTo(x + arrowHeadWidth, y + arrowLength - arrowHeadLength);
    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();

    // Display the force value and unit above the arrow
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = 'black';
    ctx.fillText(`${force.toFixed(2)} N`, x, y + arrowLength + 15);

}

function addAndDrawReaction(x, y, force) {
    let key = `${x},${y}`;  // Use a string representation of the vertex as a key

    if (vertexReactions[key]) {
        vertexReactions[key] += force;  // If there's already a force for this vertex, sum it up
    } else {
        vertexReactions[key] = force;  // Otherwise, set the force for this vertex
    }
}



function drawTruss(truss, stresses) {
    truss.forEach((triangle, index) => {
        let color = getColorForStress(stresses[index], Math.max(...stresses), Math.min(...stresses));
        drawTriangle(triangle, color);
    });

    let groundY = canvas.height * 0.8;
    truss.forEach((triangle, index) => {
        let groundY = canvas.height * 0.8;
        let vertices = [
            { x: triangle.x1, y: triangle.y1 },
            { x: triangle.x2, y: triangle.y2 },
            { x: triangle.x3, y: triangle.y3 }
        ];

        vertices.forEach(vertex => {
            if (Math.abs(vertex.y - groundY) < 5) {  // 5 is a tolerance value
                let key = `${vertex.x},${vertex.y}`;
                if (vertexReactions[key]) {
                    vertexReactions[key] += stresses[index];  // Sum reactions
                } else {
                    vertexReactions[key] = stresses[index];
                }
            }
        });
    });
}

function getColorForStress(stress, maxStress, minStress) {
    let normalized = (stress - minStress) / (maxStress - minStress);
    let red = Math.floor(255 * normalized);
    let blue = Math.floor(255 * (1 - normalized));
    return `rgb(${red}, 0, ${blue})`;
}

function drawTriangle(triangle, color) {
    ctx.beginPath();
    ctx.moveTo(triangle.x1, triangle.y1);
    ctx.lineTo(triangle.x2, triangle.y2);
    ctx.lineTo(triangle.x3, triangle.y3);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.stroke();
}

function animateJelly(truss, duration) {
    // ... [You can use the previous jelly animation logic here]
}

function drawLegend(stresses) {
    // Calculate maximum and minimum stress values
    let maxStress = Math.max(...stresses);
    let minStress = Math.min(...stresses);

    // Update the span elements in the HTML
    document.getElementById("minValue").textContent = `Min: ${minStress.toFixed(2)} N`;
    document.getElementById("maxValue").textContent = `Max: ${maxStress.toFixed(2)} N`;

    // ... other logic to draw a color gradient legend based on stress values (if needed)
}


function drawBackground() {
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0099FF");
    gradient.addColorStop(1, "#87CEFA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.8);

    ctx.fillStyle = "#654321";
    ctx.fillRect(0, canvas.height * 0.8, canvas.width, canvas.height * 0.2);
}

