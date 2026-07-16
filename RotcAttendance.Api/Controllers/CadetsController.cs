using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Services;

namespace RotcAttendance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CadetsController : ControllerBase
{
    private readonly RotcAttendanceDbContext _context;
    private readonly AttendanceService _attendanceService;

    public CadetsController(RotcAttendanceDbContext context, AttendanceService attendanceService)
    {
        _context = context;
        _attendanceService = attendanceService;
    }

    [HttpGet("cadets")]
    public async Task<IActionResult> GetCadets()
    {
        var cadets = await _context.CadetProfiles
            .OrderBy(c => c.FullName)
            .Select(c => new
            {
                id = c.Id,
                studentNumber = c.StudentNumber,
                fullName = c.FullName,
                course = c.Course,
                yearLevel = c.YearLevel,
                qrCodeValue = c.QrCodeValue,
                qrCodeImageBase64 = c.QrCodeImageBase64
            })
            .ToListAsync();

        return Ok(cadets);
    }

    [HttpPost("cadets/{id:int}/qr")]
    public async Task<IActionResult> GenerateQr(int id)
    {
        var qr = await _attendanceService.GenerateQrForCadetAsync(id);
        if (qr is null)
        {
            return NotFound(new { message = "Cadet not found." });
        }

        return Ok(qr);
    }

    [HttpGet("cadets/{id:int}/qr")]
    public async Task<IActionResult> GetQr(int id)
    {
        var qr = await _attendanceService.GetQrForCadetAsync(id);
        if (qr is null)
        {
            return NotFound(new { message = "Cadet not found." });
        }

        return Ok(qr);
    }
}
