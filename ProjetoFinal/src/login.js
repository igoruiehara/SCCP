
const form = document.getElementById("form");
const erro = document.getElementById("erro");
 
form.addEventListener("submit", function (e) {
  e.preventDefault();
 
  const login = document.getElementById("login").value;
  const senha = document.getElementById("senha").value;
 
  // Login de teste. Troque pela sua verificação real.
  if (login === "admin" && senha === "12345678") {
    window.location.href = "../telas/main_menu.html";
  } else {
    erro.textContent = "Login ou senha incorretos.";
  }
});

