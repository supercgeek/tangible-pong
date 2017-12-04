var ellipseSize = 250;

function setup() {
	createCanvas(windowWidth, windowHeight);
	document.ontouchmove = function(event) {
		event.preventDefault();
	}
}

function draw() {
	background(0);

	for (var i = 0; i < touches.length; i++) {
		var preX;
		var preY;
		var curX = touches[i].x;
		var curY = touches[i].y;

		if (i > 0) {
			preX = touches[i - 1].x;
			preY = touches[i - 1].y;
		}

		var midPoint_Left = getMidpoint(preX, preY, curX, curY, "LEFT");
		if (midPoint_Left !== false) {
			fill(255, 0, 255);
			ellipse(midPoint_Left.x, midPoint_Left.y, ellipseSize, ellipseSize);
		}
		
		var midPoint_Right = getMidpoint(preX, preY, curX, curY, "RIGHT");
		if (midPoint_Right !== false) {
			fill(0, 0, 255);
			ellipse(midPoint_Right.x, midPoint_Right.y, ellipseSize, ellipseSize);
		}
	}
}

function paddleClass() {}

function ballClass() {}

function getMidpoint(pX, pY, cX, cY, boardSide) {
	if (checkDistance(pX, pY, cX, cY, 255, 305) !== false && checkTeam(pX, pY, cX, cY) === boardSide) {
		var tempDeltaVector = checkDistance(pX, pY, cX, cY, 255, 305);
		var midPointX = pX + (tempDeltaVector.x / 2);
		var midPointY = pY + (tempDeltaVector.y / 2);
		return createVector(midPointX, midPointY);
	}
	return false;
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