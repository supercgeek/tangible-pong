var ellipseSize = 250;

function setup() {
	//other canvas
	// var myCanvas = createCanvas(windowWidth, windowHeight);
	// myCanvas.parent('TangibePong_V0');

	//normal canvas 
	createCanvas(windowWidth, windowHeight);

	// prevent scrolling of page
	document.ontouchmove = function(event) {
		event.preventDefault();
	}
}

function draw() {
	background(5);

	for (var i = 0; i < touches.length; i++) {
		var preX;
		var preY;
		var curX = touches[i].x;
		var curY = touches[i].y;

		if (i > 0) {
			preX = touches[i - 1].x;
			preY = touches[i - 1].y;
		}

		//debugPrints();
		// fill(255, 0, 0);
		// noStroke();
		// ellipse(curX, curY, 100, 100);
		// fill(255, 255, 255);
		// textSize(32);
		//text(checkDistance(preX, preY, curX, curY, 255, 305) + " 
		//| " + checkTeam(preX, preY, curX, curY), 50, 50 + (i * 50));

		if (checkDistance(preX, preY, curX, curY, 255, 305) !== false && checkTeam(preX, preY, curX, curY) === "LEFT") {
			var tempDeltaVector_Left = checkDistance(preX, preY, curX, curY, 255, 305);
			var midPointX_Left = preX + (tempDeltaVector_Left.x / 2);
			var midPointY_Left = preY + (tempDeltaVector_Left.y / 2);

			//strokeWeight(10);
			//stroke(255);
			fill(0, 0, 255);
			ellipse(midPointX_Left, midPointY_Left, ellipseSize, ellipseSize);
			//line(preX, preY, curX, curY);
			//rect(0, 50, 50, 50);
		}

		if (checkDistance(preX, preY, curX, curY, 255, 305) !== false && checkTeam(preX, preY, curX, curY) === "RIGHT") {
			var tempDeltaVector_Right = checkDistance(preX, preY, curX, curY, 255, 305);
			var midPointX_Right = preX + (tempDeltaVector_Right.x / 2);
			var midPointY_Right = preY + (tempDeltaVector_Right.y / 2);

			//strokeWeight(10);
			//stroke(255);
			fill(255, 0, 0);
			ellipse(midPointX_Right, midPointY_Right, ellipseSize, ellipseSize);
			//line(preX, preY, curX, curY);
			//rect(windowWidth / 2, 50, 50, 50);
		}
	}
}

function paddleClass() {}

function ballClass() {}

function debugPrints() {
	//text("index: " + i, curX, curY);
	//rect(preX, preY, curX, curY);
	//text("blakc", 100, 100);
	//text(dist(preX, preY, curX, curY));
	//text("Fingers Down"+touches.length, 50, 50);
	// text(touches, 50,50);
	//text("Cur Index"+i, 50, 100);
	//text(windowWidth + " " + windowHeight, 100, 100);
}

function checkTeam(X1, Y1, X2, Y2) {
	if (X1 < windowWidth / 2) {
		if (X2 < windowWidth / 2) {
			//X1
			return "LEFT";
		} else {
			//X2 is crossing the center onto the right (opposite) side
			return false;
		}
	} else {
		if (X2 > windowWidth / 2) {
			//X2
			return "RIGHT";
		} else {
			//X1 is crossing the center onto the left (opposite) side
			return false;
		}
	}
	return false;
}

function checkDistance(X1, Y1, X2, Y2, lowerBound, upperBound) {
	var distance = dist(X1, Y1, X2, Y2);
	if (distance > lowerBound && distance < upperBound) {
		var deltaVector = createVector(X2 - X1, Y2 - Y1);
		return deltaVector;
	}
	return false;
}