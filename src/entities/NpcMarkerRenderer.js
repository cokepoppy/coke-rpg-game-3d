export class NpcMarkerRenderer {
  constructor(context) {
    this.context = context;
  }

  draw(npcs, camera) {
    for (const npc of npcs) this.drawNpc(npc, camera);
  }

  drawNpc(npc, camera) {
    const context = this.context;
    const x = Math.round(npc.x - camera.x);
    const y = Math.round(npc.y - camera.y);
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.36)";
    context.beginPath();
    context.ellipse(x, y + 22, 24, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = npc.faction === "enemy" ? "#8f2d2d" : "#2d6fb2";
    context.fillRect(x - 18, y - 24, 36, 48);
    context.fillStyle = "#17100f";
    context.beginPath();
    context.arc(x, y - 32, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f5ead0";
    context.font = "15px Songti SC, serif";
    context.textAlign = "center";
    context.fillText(npc.name, x, y - 52);
    context.restore();
  }
}
