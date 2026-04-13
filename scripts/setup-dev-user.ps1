# Setup dev user via Supabase Admin API
# Run: .\scripts\setup-dev-user.ps1

$API = "http://127.0.0.1:54321"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
}

Write-Host "1. Criando usuario via Admin API..."
$body = @{
    email = "randolfgrassmannfilho@gmail.com"
    password = "adm12345"
    email_confirm = $true
    user_metadata = @{
        full_name = "Randolf Grassmann"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API/auth/v1/admin/users" -Method Post -Headers $headers -Body $body
    $userId = $response.id
    Write-Host "   Usuario criado: $userId" -ForegroundColor Green
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($err.msg -like "*already been registered*" -or $err.message -like "*already been registered*") {
        Write-Host "   Usuario ja existe, buscando..." -ForegroundColor Yellow
        $users = Invoke-RestMethod -Uri "$API/auth/v1/admin/users" -Method Get -Headers $headers
        $user = $users.users | Where-Object { $_.email -eq "randolfgrassmannfilho@gmail.com" }
        $userId = $user.id
        Write-Host "   Usuario encontrado: $userId" -ForegroundColor Green
    } else {
        Write-Host "   Erro: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "2. Vinculando ao tenant acme como tenant_admin..."
$sql = "UPDATE public.profiles SET tenant_id = 'a0000000-0000-0000-0000-000000000001', role = 'tenant_admin', full_name = 'Randolf Grassmann' WHERE id = '$userId';"

# Usar psql via docker
docker exec -i supabase_db_portal-dashboard psql -U postgres -c $sql

Write-Host ""
Write-Host "Pronto! Faca login em http://acme.localhost:5173" -ForegroundColor Cyan
Write-Host "  Email: randolfgrassmannfilho@gmail.com"
Write-Host "  Senha: adm12345"
