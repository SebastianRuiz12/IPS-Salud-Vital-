/* IPS Salud Vital – Interfaz Web (Front-end)
   Persistencia local: localStorage (sin servidor).
*/
(function(){
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const sessionKey = "ips_sv_session";
  const passKey = "ips_sv_role_passwords";
  const notificationsKey = "ips_sv_notifications";
  const patientSessionKey = "ips_sv_patient_session";
  const patientPasswordsKey = "ips_sv_patient_passwords";

  const privilegedRoles = ["Médico","Administración"];

  function getPasswords(){
    try{
      const x = JSON.parse(localStorage.getItem(passKey) || "null");
      if(x && typeof x === "object") return x;
    }catch(e){}
    return { "Médico":"Medico123", "Administración":"Admin123" };
  }
  function savePasswords(p){ localStorage.setItem(passKey, JSON.stringify(p)); }

  function getPatientPasswords(){
    try{
      const x = JSON.parse(localStorage.getItem(patientPasswordsKey) || "null");
      if(x && typeof x === "object") return x;
    }catch(e){}
    return {
      "1022334455":"Paciente123",
      "1009988776":"Paciente123",
      "1033445566":"Paciente123",
      "52024660":"Paciente123",  // Paciente de prueba para cédula corta
    }; 
  }
  function savePatientPasswords(p){ localStorage.setItem(patientPasswordsKey, JSON.stringify(p)); }

  function getSession(){
    try { return JSON.parse(localStorage.getItem(sessionKey) || "null"); } catch(e){ return null; }
  }
  function setSession(s){ localStorage.setItem(sessionKey, JSON.stringify(s)); }
  function clearSession(){ localStorage.removeItem(sessionKey); }

  function getPatientSession(){
    try { return JSON.parse(localStorage.getItem(patientSessionKey) || "null"); } catch(e){ return null; }
  }
  function setPatientSession(s){ localStorage.setItem(patientSessionKey, JSON.stringify(s)); }
  function clearPatientSession(){ localStorage.removeItem(patientSessionKey); }

  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isLogin = path === "login.html";
  const isPatientLogin = path === "portal-paciente.html";
  const isPatientDashboard = path === "portal-paciente-dashboard.html";

  function getNotifications(){
    try{
      const data = JSON.parse(localStorage.getItem(notificationsKey) || "[]");
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }
  function saveNotifications(data){ localStorage.setItem(notificationsKey, JSON.stringify(data)); }
  function addNotification(paciente, mensaje, tipo = "normal"){
    const notifications = getNotifications();
    notifications.unshift({
      paciente,
      mensaje,
      tipo,
      fecha: new Date().toLocaleString("es-CO")
    });
    saveNotifications(notifications);
    renderNotifications();
    updateNotificationBadge();
  }
  function renderNotifications(){
    const container = $("#notificationsList");
    if(!container) return;
    const notifications = getNotifications();
    if(!notifications.length){
      container.innerHTML = "<p>No hay notificaciones registradas.</p>";
      return;
    }
    container.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.tipo === "cancelada" ? "cancelada" : ""}">
        <strong>${n.paciente}</strong>
        <div>${n.mensaje}</div>
        <small>${n.fecha}</small>
      </div>
    `).join("");
  }
  function updateNotificationBadge(){
    const badge = $("#notificationCount");
    if(!badge) return;
    const total = getNotifications().length;
    badge.textContent = total;
    badge.style.display = total > 0 ? "inline-flex" : "none";
  }

  const patientsKey = "ips_sv_pacientes";
  const citasKey = "ips_sv_citas";
  const demoPacientes = [
    {doc:"1022334455", nombre:"María Camila Rojas", tel:"3124567890", correo:"maria.rojas@mail.com"},
    {doc:"1009988776", nombre:"Juan David Pérez", tel:"3001234567", correo:"juan.perez@mail.com"},
    {doc:"1033445566", nombre:"Ana Sofía Torres", tel:"3205556677", correo:"ana.torres@mail.com"},
    {doc:"52024660", nombre:"Luz Marina Ruiz Camargo", tel:"3123964568", correo:"luz.ruiz@mail.com"}
  ];
  const demoCitas = [
    {fecha:"2026-03-03", hora:"09:00", paciente:"María Camila Rojas", servicio:"Medicina General", estado:"Programada"},
    {fecha:"2026-03-03", hora:"10:30", paciente:"Juan David Pérez", servicio:"Odontología", estado:"Programada"},
    {fecha:"2026-03-04", hora:"14:00", paciente:"Ana Sofía Torres", servicio:"Pediatría", estado:"Cancelada"},
    {fecha:"2026-03-05", hora:"16:00", paciente:"Luz Marina Ruiz Camargo", servicio:"Medicina General", estado:"Programada"}
  ];

  function loadPatients(){
    try{
      const stored = JSON.parse(localStorage.getItem(patientsKey) || "null");
      return Array.isArray(stored) ? stored : demoPacientes.slice();
    }catch(e){ return demoPacientes.slice(); }
  }
  function savePatients(arr){ localStorage.setItem(patientsKey, JSON.stringify(arr)); }

  function loadCitas(){
    try{
      const stored = JSON.parse(localStorage.getItem(citasKey) || "null");
      return Array.isArray(stored) ? stored : demoCitas.slice();
    }catch(e){ return demoCitas.slice(); }
  }
  function saveCitas(arr){ localStorage.setItem(citasKey, JSON.stringify(arr)); }

  let patients = loadPatients();
  let citas = loadCitas();

  function findPatientByCedula(cedula){
    return patients.find(p => String(p.doc) === String(cedula));
  }

  if(isLogin){
    const rolSel = $("#rol");
    const passWrap = $("#passwordWrap");
    const passInput = $("#password");
    const badge = $("#privBadge");

    function togglePassword(){
      const rol = rolSel?.value || "";
      const needs = privilegedRoles.includes(rol);
      if(passWrap){
        passWrap.style.display = needs ? "block" : "none";
        if(needs){
          passInput?.setAttribute("required","required");
          badge && (badge.textContent = "Acceso con privilegios");
        }else{
          passInput?.removeAttribute("required");
          badge && (badge.textContent = "");
        }
      }
    }
    rolSel?.addEventListener("change", togglePassword);
    togglePassword();

    const resetBackdrop = $("#resetBackdrop");
    const resetClose = $("#resetClose");
    const resetCancel = $("#resetCancel");
    const forgotLink = $("#forgotLink");
    const resetForm = $("#resetForm");

    function openReset(){
      if(!resetBackdrop) return;
      resetBackdrop.style.display = "flex";
      $("#resetTitle")?.focus();
    }
    function closeReset(){
      if(!resetBackdrop) return;
      resetBackdrop.style.display = "none";
    }

    forgotLink?.addEventListener("click", (e)=>{ e.preventDefault(); openReset(); });
    resetClose?.addEventListener("click", closeReset);
    resetCancel?.addEventListener("click", closeReset);
    resetBackdrop?.addEventListener("click", (e)=>{ if(e.target === resetBackdrop) closeReset(); });
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && resetBackdrop?.style.display==="flex") closeReset(); });

    resetForm?.addEventListener("submit", (e)=>{
      e.preventDefault();
      const role = $("#resetRole")?.value;
      const p1 = ($("#resetPass1")?.value || "").trim();
      const p2 = ($("#resetPass2")?.value || "").trim();
      if(!p1 || p1.length < 6){
        alert("La contraseña debe tener mínimo 6 caracteres.");
        return;
      }
      if(p1 !== p2){
        alert("Las contraseñas no coinciden.");
        return;
      }
      const pw = getPasswords();
      pw[role] = p1;
      savePasswords(pw);
      alert("Contraseña actualizada.");
      closeReset();
    });

    $("#loginForm")?.addEventListener("submit", (e)=>{
      e.preventDefault();
      const nombre = ($("#nombre")?.value || "").trim() || "Usuario";
      const rol = ($("#rol")?.value || "Recepción");
      const password = ($("#password")?.value || "");
      if(privilegedRoles.includes(rol)){
        const pw = getPasswords();
        if(password !== pw[rol]){
          alert("Contraseña incorrecta.");
          return;
        }
      }
      setSession({ nombre, rol, ts: Date.now() });
      location.href = "index.html";
    });

    const adminSession = getSession();
    if(adminSession) location.href = "index.html";
    return;
  }

  if(isPatientLogin){
    const patientForgotLink = $("#patientForgotLink");
    const patientResetBackdrop = $("#patientResetBackdrop");
    const patientResetClose = $("#patientResetClose");
    const patientResetCancel = $("#patientResetCancel");
    const patientResetForm = $("#patientResetForm");

    function openPatientReset(){
      if(!patientResetBackdrop) return;
      patientResetBackdrop.style.display = "flex";
      $("#patientResetTitle")?.focus();
    }
    function closePatientReset(){
      if(!patientResetBackdrop) return;
      patientResetBackdrop.style.display = "none";
    }

    patientForgotLink?.addEventListener("click", (e)=>{ e.preventDefault(); openPatientReset(); });
    patientResetClose?.addEventListener("click", closePatientReset);
    patientResetCancel?.addEventListener("click", closePatientReset);
    patientResetBackdrop?.addEventListener("click", (e)=>{ if(e.target === patientResetBackdrop) closePatientReset(); });

    patientResetForm?.addEventListener("submit", (e)=>{
      e.preventDefault();
      const cedula = ($("#resetCedula")?.value || "").trim();
      const p1 = ($("#resetPatientPass1")?.value || "").trim();
      const p2 = ($("#resetPatientPass2")?.value || "").trim();
      if(!cedula || !findPatientByCedula(cedula)){
        alert("No se encontró un paciente con ese número de cédula.");
        return;
      }
      if(!p1 || p1.length < 6){
        alert("La contraseña debe tener mínimo 6 caracteres.");
        return;
      }
      if(p1 !== p2){
        alert("Las contraseñas no coinciden.");
        return;
      }
      const pw = getPatientPasswords();
      pw[cedula] = p1;
      savePatientPasswords(pw);
      alert("Contraseña del paciente actualizada.");
      closePatientReset();
    });

    $("#patientLoginForm")?.addEventListener("submit", (e)=>{
      e.preventDefault();
      const cedula = ($("#patientCedula")?.value || "").trim();
      const password = ($("#patientPassword")?.value || "").trim();
      const patient = findPatientByCedula(cedula);
      if(!patient){
        alert("No se encontró un paciente con ese número de cédula.");
        return;
      }
      const passwords = getPatientPasswords();
      const expected = passwords[cedula] || "Paciente123";
      if(password !== expected){
        alert("Contraseña incorrecta.");
        return;
      }
      setPatientSession({
        cedula: patient.doc,
        nombre: patient.nombre,
        correo: patient.correo || "",
        ts: Date.now()
      });
      location.href = "portal-paciente-dashboard.html";
    });

    const existingPatientSession = getPatientSession();
    if(existingPatientSession) location.href = "portal-paciente-dashboard.html";
    return;
  }

  if(isPatientDashboard){
    const ps = getPatientSession();
    if(!ps){
      location.href = "portal-paciente.html";
      return;
    }

    const sessionLabel = $("#patientSessionUser");
    const welcomeName = $("#patientWelcomeName");
    if(sessionLabel) sessionLabel.textContent = `${ps.nombre} • ${ps.cedula}`;
    if(welcomeName) welcomeName.textContent = `Hola, ${ps.nombre}`;

    const patientAppointmentsTbody = $("#patientAppointmentsTbody");
    const patientNotificationsList = $("#patientNotificationsList");
    const patientNotificationsModalList = $("#patientNotificationsModalList");
    const btnPatientNotifications = $("#btnPatientNotifications");
    const patientNotificationsBackdrop = $("#patientNotificationsBackdrop");
    const patientNotificationsClose = $("#patientNotificationsClose");
    const btnPatientLogout = $("#btnPatientLogout");
    const patientNotificationCount = $("#patientNotificationCount");

    btnPatientLogout?.addEventListener("click", ()=>{
      clearPatientSession();
      location.href = "portal-paciente.html";
    });

    function renderPatientAppointments(){
      if(!patientAppointmentsTbody) return;
      const list = loadCitas().filter(c => c.paciente === ps.nombre);
      if(!list.length){
        patientAppointmentsTbody.innerHTML = `<tr><td colspan="4">No tienes citas registradas.</td></tr>`;
        return;
      }
      patientAppointmentsTbody.innerHTML = list.map(c => `
        <tr>
          <td>${c.fecha}</td>
          <td>${c.hora}</td>
          <td>${c.servicio}</td>
          <td><span class="pill ${(c.estado||"").toLowerCase().includes("cancel") ? "warn" : "ok"}">${c.estado}</span></td>
        </tr>
      `).join("");
    }

    function getPatientNotifications(){
      return getNotifications().filter(n => n.paciente === ps.nombre);
    }

    function renderPatientNotifications(){
      const notes = getPatientNotifications();
      const html = notes.length ? notes.map(n => `
        <div class="notification-item ${n.tipo === "cancelada" ? "cancelada" : ""}">
          <strong>${n.paciente}</strong>
          <div>${n.mensaje}</div>
          <small>${n.fecha}</small>
        </div>
      `).join("") : "<p>No hay notificaciones registradas para este paciente.</p>";
      if(patientNotificationsList) patientNotificationsList.innerHTML = html;
      if(patientNotificationsModalList) patientNotificationsModalList.innerHTML = html;
      if(patientNotificationCount){
        patientNotificationCount.textContent = notes.length;
        patientNotificationCount.classList.toggle("hidden", !notes.length);
      }
    }

    function openPatientNotifications(){
      if(!patientNotificationsBackdrop) return;
      renderPatientNotifications();
      patientNotificationsBackdrop.style.display = "flex";
    }
    function closePatientNotifications(){
      if(!patientNotificationsBackdrop) return;
      patientNotificationsBackdrop.style.display = "none";
    }

    btnPatientNotifications?.addEventListener("click", openPatientNotifications);
    patientNotificationsClose?.addEventListener("click", closePatientNotifications);
    patientNotificationsBackdrop?.addEventListener("click", (e)=>{ if(e.target === patientNotificationsBackdrop) closePatientNotifications(); });

    renderPatientAppointments();
    renderPatientNotifications();
    return;
  }

  const s = getSession();
  if(!s){
    location.href = "login.html";
    return;
  }

  const permissions = {
    "Recepción":     { pacientes:"rw", citas:"rw", historia:"r",  facturacion:"r",  reportes:"r" },
    "Facturación":   { pacientes:"r",  citas:"r",  historia:"r",  facturacion:"rw", reportes:"r" },
    "Médico":        { pacientes:"r",  citas:"r",  historia:"rw", facturacion:"r",  reportes:"r" },
    "Administración":{ pacientes:"rw", citas:"rw", historia:"rw", facturacion:"rw", reportes:"rw" },
  };

  function moduleFromPath(p){
    if(p === "index.html") return "inicio";
    if(p.includes("pacientes")) return "pacientes";
    if(p.includes("citas")) return "citas";
    if(p.includes("historia")) return "historia";
    if(p.includes("facturacion")) return "facturacion";
    if(p.includes("reportes")) return "reportes";
    return "inicio";
  }
  const currentModule = moduleFromPath(path);
  const rolePerm = permissions[s.rol] || permissions["Recepción"];
  function can(actionModule, action){
    if(actionModule === "inicio") return true;
    const level = rolePerm[actionModule] || "r";
    if(action === "read") return true;
    if(action === "write") return level.includes("w");
    return false;
  }

  const userEl = $("#sessionUser");
  if(userEl) userEl.textContent = `${s.nombre} • ${s.rol}`;

  $("#btnLogout")?.addEventListener("click", ()=>{
    clearSession();
    location.href = "login.html";
  });

  $$(".nav a").forEach(a=>{
    const href = (a.getAttribute("href")||"").split("/").pop().toLowerCase();
    const mod = moduleFromPath(href);
    if(href === path) a.setAttribute("aria-current","page");
    if(mod !== "inicio"){
      const allowed = can(mod, "read");
      if(!allowed){
        a.classList.add("is-disabled");
        a.setAttribute("tabindex","-1");
        a.setAttribute("aria-disabled","true");
      }
    }
  });

  if(currentModule !== "inicio" && !can(currentModule, "read")){
    location.href = "index.html";
    return;
  }

  function toast(msg){
    const box = $("#toast");
    if(!box) return;
    box.textContent = msg;
    box.hidden = false;
    box.style.opacity = "1";
    clearTimeout(box._t);
    box._t = setTimeout(()=>{ box.style.opacity="0"; setTimeout(()=> box.hidden=true, 250); }, 1600);
  }

  const notificationsBackdrop = $("#notificationsBackdrop");
  const btnNotificaciones = $("#btnNotificaciones");
  const notificationsClose = $("#notificationsClose");
  const clearNotifications = $("#clearNotifications");

  function openNotifications(){
    if(!notificationsBackdrop) return;
    renderNotifications();
    updateNotificationBadge();
    notificationsBackdrop.style.display = "flex";
  }
  function closeNotifications(){
    if(!notificationsBackdrop) return;
    notificationsBackdrop.style.display = "none";
  }

  btnNotificaciones?.addEventListener("click", openNotifications);
  notificationsClose?.addEventListener("click", closeNotifications);
  notificationsBackdrop?.addEventListener("click", (e)=>{ if(e.target === notificationsBackdrop) closeNotifications(); });
  clearNotifications?.addEventListener("click", ()=>{
    localStorage.removeItem(notificationsKey);
    renderNotifications();
    updateNotificationBadge();
  });

  renderNotifications();
  updateNotificationBadge();

  const pacientesTbody = $("#pacientesTbody");
  function renderPacientes(rows){
    if(!pacientesTbody) return;
    pacientesTbody.innerHTML = "";
    rows.forEach((p, idx)=>{
      const tr = document.createElement("tr");
      const actionBtns = can("pacientes","write")
        ? `<div class="row-actions">
             <button class="btn btn-ghost" type="button" data-edit="${idx}">Editar</button>
             <button class="btn btn-danger" type="button" data-del="${idx}">Eliminar</button>
           </div>`
        : `<span class="pill">Solo lectura</span>`;
      tr.innerHTML = `
        <td>${p.doc}</td>
        <td>${p.nombre}</td>
        <td>${p.tel}</td>
        <td>${p.correo}</td>
        <td>${actionBtns}</td>`;
      pacientesTbody.appendChild(tr);
    });
  }
  renderPacientes(patients);

  const pacienteForm = $("#pacienteForm");
  const pacienteFormCard = pacienteForm?.closest(".card");
  if(pacienteForm && !can("pacientes","write")) pacienteFormCard?.classList.add("is-disabled");

  const buscarPaciente = $("#buscarPaciente");
  if(buscarPaciente){
    buscarPaciente.addEventListener("input", ()=>{
      const q = buscarPaciente.value.trim().toLowerCase();
      const filtered = patients.filter(p =>
        p.doc.includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.tel.includes(q)
      );
      renderPacientes(filtered);
    });
  }

  let editIndex = null;
  if(pacienteForm){
    pacienteForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      if(!can("pacientes","write")){
        toast("No tienes permisos para editar pacientes.");
        return;
      }
      const doc = ($("#p_doc")?.value || "").trim();
      const nombre = ($("#p_nombre")?.value || "").trim();
      const tel = ($("#p_tel")?.value || "").trim();
      const correo = ($("#p_correo")?.value || "").trim();
      if(!doc || !nombre){
        toast("Documento y Nombre son obligatorios.");
        return;
      }
      const item = {doc, nombre, tel, correo};
      if(editIndex !== null){
        patients[editIndex] = item;
        editIndex = null;
        $("#pacienteSubmit").textContent = "Guardar paciente";
        toast("Paciente actualizado.");
      }else{
        patients.unshift(item);
        toast("Paciente registrado.");
      }
      savePatients(patients);
      renderPacientes(patients);
      pacienteForm.reset();
      $("#p_doc")?.focus();
    });
  }

  if(pacientesTbody){
    pacientesTbody.addEventListener("click", (e)=>{
      const btn = e.target.closest("button");
      if(!btn) return;
      if(!can("pacientes","write")){
        toast("Acción no permitida.");
        return;
      }
      const del = btn.getAttribute("data-del");
      const edit = btn.getAttribute("data-edit");
      if(del !== null){
        const idx = Number(del);
        patients.splice(idx, 1);
        savePatients(patients);
        renderPacientes(patients);
        toast("Paciente eliminado.");
      }
      if(edit !== null){
        const idx = Number(edit);
        const p = patients[idx];
        if(p){
          $("#p_doc").value = p.doc;
          $("#p_nombre").value = p.nombre;
          $("#p_tel").value = p.tel;
          $("#p_correo").value = p.correo;
          editIndex = idx;
          $("#pacienteSubmit").textContent = "Actualizar paciente";
          toast("Edita y guarda.");
          window.scrollTo({top:0, behavior:"smooth"});
        }
      }
    });
  }

  const citasTbody = $("#citasTbody");
  function renderCitas(rows){
    if(!citasTbody) return;
    citasTbody.innerHTML = "";
    rows.forEach((c, idx)=>{
      const estadoClass = (c.estado||"").toLowerCase().includes("cancel") ? "warn":"ok";
      const actions = can("citas","write")
        ? `<div class="row-actions">
             <button class="btn btn-ghost" type="button" data-cancel="${idx}">Cancelar</button>
             <button class="btn btn-danger" type="button" data-remove="${idx}">Eliminar</button>
           </div>`
        : `<span class="pill">Solo lectura</span>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.fecha}</td>
        <td>${c.hora}</td>
        <td>${c.paciente}</td>
        <td>${c.servicio}</td>
        <td><span class="pill ${estadoClass}">${c.estado}</span></td>
        <td>${actions}</td>`;
      citasTbody.appendChild(tr);
    });
  }
  renderCitas(citas);

  const citaForm = $("#citaForm");
  const citaFormCard = citaForm?.closest(".card");
  if(citaForm && !can("citas","write")) citaFormCard?.classList.add("is-disabled");

  if(citaForm){
    citaForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      if(!can("citas","write")){
        toast("No tienes permisos para asignar citas.");
        return;
      }
      const fecha = $("#c_fecha")?.value;
      const hora  = $("#c_hora")?.value;
      const paciente = ($("#c_paciente")?.value || "").trim();
      const servicio = $("#c_servicio")?.value;
      if(!fecha || !hora || !paciente){
        toast("Fecha, Hora y Paciente son obligatorios.");
        return;
      }
      citas.unshift({fecha, hora, paciente, servicio, estado:"Programada"});
      addNotification(
        paciente,
        `Su cita ha sido programada para el día ${fecha} a las ${hora} en el servicio de ${servicio}.`,
        "programada"
      );
      saveCitas(citas);
      renderCitas(citas);
      citaForm.reset();
      toast("Cita asignada.");
    });
  }

  if(citasTbody){
    citasTbody.addEventListener("click", (e)=>{
      const btn = e.target.closest("button");
      if(!btn) return;
      if(!can("citas","write")){
        toast("Acción no permitida.");
        return;
      }
      const cancel = btn.getAttribute("data-cancel");
      const remove = btn.getAttribute("data-remove");
      if(cancel !== null){
        const idx = Number(cancel);
        if(citas[idx]){
          citas[idx].estado = "Cancelada";
          addNotification(
            citas[idx].paciente,
            `Su cita del día ${citas[idx].fecha} a las ${citas[idx].hora} ha sido cancelada.`,
            "cancelada"
          );
          saveCitas(citas);
          renderCitas(citas);
          toast("Cita cancelada.");
        }
      }
      if(remove !== null){
        const idx = Number(remove);
        citas.splice(idx, 1);
        saveCitas(citas);
        renderCitas(citas);
        toast("Cita eliminada.");
      }
    });
  }

  function safeLen(key, fallback){
    try{
      const x = JSON.parse(localStorage.getItem(key)||"null");
      return Array.isArray(x) ? x.length : fallback;
    }catch(e){ return fallback; }
  }
  const kpiPac = $("#kpiPacientes");
  const kpiCit = $("#kpiCitas");
  if(kpiPac) kpiPac.textContent = safeLen(patientsKey, 3);
  if(kpiCit) kpiCit.textContent = safeLen(citasKey, 3);
})();
