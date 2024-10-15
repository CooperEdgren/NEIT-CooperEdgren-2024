

    const c = document.getElementById("myCanvas");
    const ctx = c.getContext("2d");
    //rectangle
    ctx.beginPath();
    ctx.fillStyle = "#FFCC00";
    ctx.fillRect(85, 300, 100, 100);
    ctx.stroke();

    //circle
    ctx.beginPath();
    ctx.arc(385, 440, 40, 0, 2*Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.stroke();

