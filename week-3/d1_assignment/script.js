

    const c = document.getElementById("myCanvas");
    const ctx = c.getContext("2d");
    //rectangle
    ctx.beginPath();
    ctx.fillStyle = "#ffcc00";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;
    ctx.fillRect(85, 301, 100, 100);
    ctx.stroke();

    //circle
    ctx.beginPath();
    ctx.arc(385, 441, 66, 0, 2*Math.PI);
    ctx.fillStyle = "#ffff00";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "red";
    ctx.fill();
    ctx.stroke();

    //line
    ctx.beginPath();
    ctx.moveTo(85, 682);
    ctx.lineTo(278, 549);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgb(255, 0, 0)";
    ctx.stroke();

    //pentagon
    ctx.beginPath();
    ctx.moveTo(557, 308);
    ctx.lineTo(667, 284);
    ctx.lineTo(724, 380);
    ctx.lineTo(650, 464);
    ctx.lineTo(548, 420);
    ctx.lineTo(557, 308);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#00ffff";
    ctx.fillStyle = "#ff00ff";
    ctx.fill();
    ctx.stroke();

    //star
    ctx.beginPath();
    ctx.moveTo(635, 497);
    ctx.lineTo(603, 554);
    ctx.lineTo(538, 567);
    ctx.lineTo(583, 614);
    ctx.lineTo(575, 681);
    ctx.lineTo(635, 653);
    ctx.lineTo(696, 681);
    ctx.lineTo(688, 616);
    ctx.lineTo(733, 567);
    ctx.lineTo(668, 554);
    ctx.lineTo(635, 496);
    ctx.lineWidth = 5;
    ctx.fillStyle = "#ffff00";
    ctx.strokeStyle = "rgb(32, 32, 32)";
    ctx.fill();
    ctx.stroke();