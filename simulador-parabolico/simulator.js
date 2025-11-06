// Envolvemos todo en un listener para asegurar que el DOM está cargado
// y para no contaminar el scope global.
document.addEventListener("DOMContentLoaded", () => {
    const gravity = 9.81;
    const mass = 3;
    const heightRange = document.getElementById("heightRange");
    const heightValue = document.getElementById("heightValue");
    const massValue = document.getElementById("massValue");
    const velocityValue = document.getElementById("velocityValue");
    const curvePath = document.getElementById("curvePath");
    const car = document.getElementById("car");
    const startButton = document.getElementById("startButton");
    const wheels = document.querySelectorAll(".wheel");
    const pathLength = curvePath.getTotalLength();
    const maxHeight = parseFloat(heightRange.max);
    const wheelRadius = 20;
    const maxTravel = pathLength - 16;
    massValue.textContent = `Masa: ${mass.toFixed(1)} kg`;
    let animationFrame = null;
    let animationStart = null;
    let animationDuration = 2.8;
    let isAnimating = false;
    let targetTravel = maxTravel;
    let lastLength = 0;
    let wheelAngle = 0;

    const resetMotion = () => {
        lastLength = 0;
        wheelAngle = 0;
        wheels.forEach(wheel => {
            wheel.style.transform = "rotate(0deg)";
        });
        positionCar(0);
    };

    const positionCar = length => {
        const travel = Math.min(Math.max(length, 0), maxTravel);
        const point = curvePath.getPointAtLength(travel);
        const previous = curvePath.getPointAtLength(Math.max(travel - 1, 0));
        const angleRad = Math.atan2(point.y - previous.y, point.x - previous.x);
        const delta = travel - lastLength;
        wheelAngle += delta / wheelRadius;
        const wheelAngleDeg = wheelAngle * 180 / Math.PI;
        wheels.forEach(wheel => {
            wheel.style.transform = `rotate(${wheelAngleDeg}deg)`;
        });
        car.setAttribute("transform", `translate(${point.x}, ${point.y}) rotate(${angleRad * 180 / Math.PI})`);
        lastLength = travel;
    };

    const stopAnimation = reset => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        isAnimating = false;
        animationStart = null;
        startButton.disabled = false;
        startButton.textContent = "Iniciar";
        if (reset) {
            resetMotion();
        }
    };

    const runAnimation = timestamp => {
        if (!animationStart) {
            animationStart = timestamp;
        }
        const elapsed = (timestamp - animationStart) / 1000;
        const progress = Math.min(elapsed / animationDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const travel = eased * targetTravel;
        positionCar(travel);
        if (progress < 1) {
            animationFrame = requestAnimationFrame(runAnimation);
        } else {
            stopAnimation(false);
            positionCar(targetTravel);
        }
    };

    const updateSimulation = () => {
        const height = parseFloat(heightRange.value);
        const velocity = Math.sqrt(2 * gravity * height);
        targetTravel = maxTravel * (height / maxHeight);
        heightValue.textContent = `Altura: ${height.toFixed(1)} m`;
        velocityValue.textContent = `Velocidad: ${velocity.toFixed(2)} m/s`;
        stopAnimation(true);
    };

    const startAnimation = () => {
        if (isAnimating) return;
        const height = parseFloat(heightRange.value);
        const velocity = Math.sqrt(2 * gravity * height);
        targetTravel = maxTravel * (height / maxHeight);
        animationDuration = Math.max(1.6, Math.min(6, targetTravel / Math.max(velocity, 0.5) * 0.12 + 1.4));
        stopAnimation(true);
        startButton.disabled = true;
        startButton.textContent = "Animando...";
        isAnimating = true;
        animationFrame = requestAnimationFrame(runAnimation);
    };

    heightRange.addEventListener("input", updateSimulation);
    startButton.addEventListener("click", startAnimation);
    updateSimulation();
});