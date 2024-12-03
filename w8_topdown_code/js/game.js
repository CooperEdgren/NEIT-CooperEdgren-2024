
var c = document.querySelector(`canvas`)
var ctx = c.getContext(`2d`)
var fps = 1000/60
var timer = setInterval(main, fps)

function main()
{
    ctx.clearRect(0,0,c.width,c.height); 
    state()
}

//setup
var state;
var button = new GameObject();
var avatar = new GameObject();
var wall = new GameObject();
var level = new GameObject();
var sword = new GameObject();
var bad = new GameObject();
var wall = [];

function init()
{
    state = menu

    avatar.color = `green`;

    level.x = 0; 
    level.y = 0;

    wall[0]=new GameObject();
    wall[0].h = 20;
    wall[0].w = 500;
    wall[0].color = `purple`
    wall[0].x = c.width/2;
    wall[0].y = 100
    wall[0].world = level

    wall[1]=new GameObject();
    wall[1].h = 400;
    wall[1].w = 24;
    wall[1].color = `purple`
    wall[1].x = 700;
    wall[1].y = c.height/2
    wall[1].world = level

    wall[2]=new GameObject();
    wall[2].h = 400;
    wall[2].w = 24;
    wall[2].color = `purple`
    wall[2].x = 200;
    wall[2].y = c.height/2
    wall[2].world = level

    wall[3]=new GameObject();
    wall[3].w = 400;
    wall[3].h = 24;
    wall[3].color = `purple`
    wall[3].x = c.width/2
    wall[3].y = c.height-100
    wall[3].world = level

    sword.color = `#000000`;
}

init();

/*---------------Game Screens (states)----------------*/
function menu()
{
    if(clicked(button))
    {
        state = game;
    }
    button.render()
}

function win()
{

}
function lose()
{

}

function game()
{
    
    sword.x = 10000;
    if(a == true)
    {
        avatar.vx += -1;
    }
    if(d == true)
    {
        avatar.vx += 1;
    }
    if(w == true)
    {
        avatar.vy += -1;
    }
    if(s == true)
    {
        avatar.vy += 1;
    }
    if(up == true)
    {
        sword.x = avatar.top().x;
        sword.y = avatar.top().y;
        sword.w = 12;
        sword.h = 100;
    }
    if(down == true)
    {
        sword.x = avatar.bottom().x;
        sword.y = avatar.bottom().y;
        sword.w = 12;
        sword.h = 100;
    }
    if(left == true)
    {
        sword.x = avatar.left().x;
        sword.y = avatar.left().y;
        sword.h = 12;
        sword.w = 100;
    }
    if(right == true)
    {
        sword.x = avatar.right().x;
        sword.y = avatar.right().y;
        sword.h = 12;
        sword.w = 100;
    }
    avatar.vx *= .85;
    avatar.vy *= .85;
    avatar.move();

    //used to move the level. 
    var offset = {x:avatar.vx, y:avatar.vy}

    for(let i=0; i<wall.length; i++)
    {
        while(wall[i].isOverPoint(avatar.bottom()))
        {
            avatar.vy = 0;
            avatar.y--;
            offset.y--;
        }
        while(wall[i].isOverPoint(avatar.top()))
        {
            avatar.vy = 0;
            avatar.y++;
            offset.y++;
        }
        while(wall[i].isOverPoint(avatar.left()))
        {
            avatar.vx = 0;
            avatar.x++;
            offset.x++;
        }
        while(wall[i].isOverPoint(avatar.right()))
        {
            avatar.vx = 0;
            avatar.x--;
            offset.x--;
        }
      
    }
    
   

    /*-------Level movement threshold----*/
    //if(avatar.x > 500 || avatar.x < 300)
    {
        //Level movement code
        level.x -= offset.x;
        avatar.x -= offset.x;
        level.y -= offset.y;
        avatar.y -= offset.y;
    }

    /*----- Camera Code -----------
        var dx = c.width/2 - avatar.x
        var dy = c.height/2 - avatar.y
        
        level.x += dx*.05; 
        avatar.x += dx*.05; 
        level.y += dy*.15; 
        avatar.y += dy*.15; 
    ----------------------------*/
    
   for(let i=0;i<wall.length; i++)
   {
    wall[i].render();
   }

    sword.render();
    avatar.render();
    
}



