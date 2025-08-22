function $(id){ return document.getElementById(id); }

function load() {
  chrome.storage.local.get(["tb_enabled","tb_volume","tb_play_in_passwords","tb_include_content_editable"], (res) => {
    $("enabled").checked = res.tb_enabled ?? true;
    const vol = typeof res.tb_volume === "number" ? res.tb_volume : 0.7;
    $("volume").value = vol;
    $("volv").textContent = vol.toFixed(2);
    $("pw").checked = !!res.tb_play_in_passwords;
    $("editable").checked = res.tb_include_content_editable !== false;
  });
}

function save(key, val) {
  chrome.storage.local.set({ [key]: val });
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  $("enabled").addEventListener("change", (e)=> save("tb_enabled", e.target.checked));
  $("volume").addEventListener("input", (e)=> {
    const v = parseFloat(e.target.value);
    $("volv").textContent = v.toFixed(2);
    save("tb_volume", v);
  });
  $("pw").addEventListener("change", (e)=> save("tb_play_in_passwords", e.target.checked));
  $("editable").addEventListener("change", (e)=> save("tb_include_content_editable", e.target.checked));
});
