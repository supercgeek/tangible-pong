function getMidpoint(pX, pY, cX, cY, boardSide) {
	if (checkDistance(pX, pY, cX, cY, ellipseSize - 50, ellipseSize) !== false && checkTeam(pX, pY, cX, cY) === boardSide) {
		var tempDeltaVector = checkDistance(pX, pY, cX, cY, ellipseSize - 50, ellipseSize);
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
	// stroke(255);
	// line(X1,Y1, X2+500, Y2+500);
	// print(distance, lowerBound, upperBound);
	if (distance > lowerBound && distance < upperBound) {
		var deltaVector = createVector(X2 - X1, Y2 - Y1);
		return deltaVector;
	}
	return false;
}

// function returnAngle(X1, Y1, X2, Y2) {
// 	// var angle;
// 	// angle = 
// 	return atan(Y2 - Y1 / X2 - X1);;
// }