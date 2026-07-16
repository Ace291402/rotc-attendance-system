using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Models;
using RotcAttendance.Api.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RotcAttendance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthenticationController : ControllerBase
{
    private readonly RotcAttendanceDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly QrService _qrService;

    public AuthenticationController(RotcAttendanceDbContext context, IConfiguration configuration, QrService qrService)
    {
        _context = context;
        _configuration = configuration;
        _qrService = qrService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return Conflict(new { message = "User already exists." });
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            Name = request.Username,
            Platoon = "Platoon Alpha"
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        var qrValue = _qrService.GenerateUniqueValue();
        var cadet = new CadetProfile
        {
            UserId = user.Id,
            FullName = request.Username,
            Email = request.Username,
            QrCodeValue = qrValue,
            QrCodeImageBase64 = _qrService.GeneratePngBase64(qrValue)
        };

        await _context.CadetProfiles.AddAsync(cadet);
        await _context.SaveChangesAsync();

        var qr = await _context.CadetProfiles.FindAsync(cadet.Id);
        return Ok(new
        {
            success = true,
            message = "User registered.",
            cadet = new
            {
                id = cadet.Id,
                fullName = cadet.FullName,
                studentNumber = cadet.StudentNumber,
                qrCodeValue = qr?.QrCodeValue,
                qrCodeImageBase64 = qr?.QrCodeImageBase64
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Username == request.Username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var token = CreateToken(user);
        var cadetProfile = await _context.CadetProfiles.SingleOrDefaultAsync(c => c.UserId == user.Id);
        if (cadetProfile is not null && (string.IsNullOrWhiteSpace(cadetProfile.QrCodeValue) || string.IsNullOrWhiteSpace(cadetProfile.QrCodeImageBase64)))
        {
            var qrValue = _qrService.GenerateUniqueValue();
            cadetProfile.QrCodeValue = qrValue;
            cadetProfile.QrCodeImageBase64 = _qrService.GeneratePngBase64(qrValue);
            cadetProfile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            token,
            user = new { id = user.Id, username = user.Username, role = user.Role, name = user.Name ?? user.Username, platoon = user.Platoon ?? "Platoon Alpha" },
            cadet = cadetProfile is null ? null : new
            {
                id = cadetProfile.Id,
                fullName = cadetProfile.FullName,
                studentNumber = cadetProfile.StudentNumber,
                qrCodeValue = cadetProfile.QrCodeValue,
                qrCodeImageBase64 = cadetProfile.QrCodeImageBase64
            }
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout() => Ok();

    private string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "super-secret-key-rotc-123456"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "rotc-attendance",
            audience: _configuration["Jwt:Audience"] ?? "rotc-attendance",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "cadet";
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "cadet";
}
