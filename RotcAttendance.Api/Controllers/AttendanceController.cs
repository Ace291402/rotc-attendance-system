using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Services;

namespace RotcAttendance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttendanceController : ControllerBase
{
    private readonly AttendanceService _service;
    private readonly RotcAttendanceDbContext _context;

    public AttendanceController(AttendanceService service, RotcAttendanceDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("attendance")]
    public async Task<IActionResult> GetAttendance()
    {
        var records = await _context.AttendanceRecords
            .Include(a => a.CadetProfile)
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                id = a.Id,
                cadetId = a.CadetProfileId,
                date = a.Date.ToString("yyyy-MM-dd"),
                status = a.Status,
                cadet = new
                {
                    fullName = a.CadetProfile!.FullName,
                    course = a.CadetProfile.Course,
                    yearLevel = a.CadetProfile.YearLevel
                }
            })
            .ToListAsync();

        return Ok(records);
    }

    [HttpPost("attendance")]
    public async Task<IActionResult> CreateAttendance([FromBody] CreateAttendanceRequest request)
    {
        var result = await _service.MarkAttendanceAsync(request.CadetId, request.OfficerName);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { success = true, message = result.Message, attendanceId = result.AttendanceId, cadetName = result.CadetName });
    }

    [HttpPost("scan")]
    public async Task<IActionResult> ScanQr([FromBody] ScanQrRequest request)
    {
        var cadet = await _service.ResolveCadetByQrAsync(request.QrCodeValue);
        if (cadet is null)
        {
            return NotFound(new { success = false, message = "QR code not recognized." });
        }

        var result = await _service.MarkAttendanceAsync(cadet.CadetId, request.OfficerName);
        if (!result.Success)
        {
            return Conflict(new { success = false, message = result.Message });
        }

        return Ok(new { success = true, message = "Attendance recorded.", cadetName = result.CadetName });
    }

    [HttpDelete("attendance/{id:int}")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var record = await _context.AttendanceRecords.FindAsync(id);
        if (record is null)
        {
            return NotFound();
        }

        _context.AttendanceRecords.Remove(record);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("report")]
    public async Task<IActionResult> GetReport()
    {
        var today = DateTime.UtcNow.Date;
        var total = await _context.AttendanceRecords.CountAsync(a => a.Date == today);
        return Ok(new { weeklySummary = $"{total} attendance marks recorded today.", pendingReview = 0, exportReady = total });
    }
}

public class CreateAttendanceRequest
{
    public int CadetId { get; set; }
    public string OfficerName { get; set; } = string.Empty;
}

public class ScanQrRequest
{
    public string QrCodeValue { get; set; } = string.Empty;
    public string OfficerName { get; set; } = string.Empty;
}
