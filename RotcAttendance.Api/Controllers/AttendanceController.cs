using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Services;

namespace RotcAttendance.Api.Controllers;

[ApiController]
[Authorize]
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
        var attendanceQuery = _context.AttendanceRecords
            .Include(a => a.CadetProfile)
            .AsQueryable();

        if (User.IsInRole("cadet"))
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Forbid();
            }

            var cadetProfile = await _context.CadetProfiles.SingleOrDefaultAsync(c => c.UserId == userId);
            if (cadetProfile is null)
            {
                return Forbid();
            }

            attendanceQuery = attendanceQuery.Where(a => a.CadetProfileId == cadetProfile.Id);
        }

        var records = await attendanceQuery
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
    [Authorize(Roles = "admin,officer")]
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
    [Authorize(Roles = "admin,officer")]
    public async Task<IActionResult> ScanQr([FromBody] ScanQrRequest request)
    {
        var qrValue = string.IsNullOrWhiteSpace(request.QrCodeValue) ? request.QrCodeId : request.QrCodeValue;
        if (string.IsNullOrWhiteSpace(qrValue))
        {
            return BadRequest(new { success = false, message = "Invalid QR payload" });
        }

        var cadet = await _service.ResolveCadetByQrAsync(qrValue);
        if (cadet is null)
        {
            return NotFound(new { success = false, message = "QR code not recognized." });
        }

        // If attendance already exists for today, return the existing record (idempotent)
        var attendanceDateToday = DateTime.UtcNow.Date;
        var already = await _context.AttendanceRecords
            .Where(a => a.CadetProfileId == cadet.CadetId && a.Date == attendanceDateToday)
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        if (already is not null)
        {
            return Ok(new { success = true, message = "Attendance already recorded.", attendanceId = already.Id, cadetName = cadet.FullName });
        }

        var result = await _service.MarkAttendanceAsync(cadet.CadetId, request.OfficerName);
        if (!result.Success)
        {
            // If attendance already exists for today, return OK with existing record info (idempotent)
            if (result.Message?.Contains("Attendance already recorded", StringComparison.OrdinalIgnoreCase) == true)
            {
                var attendanceDate = DateTime.UtcNow.Date;
                var existing = await _context.AttendanceRecords
                    .Where(a => a.CadetProfileId == cadet.CadetId && a.Date == attendanceDate)
                    .OrderByDescending(a => a.Id)
                    .FirstOrDefaultAsync();

                if (existing is not null)
                {
                    return Ok(new { success = true, message = "Attendance already recorded.", attendanceId = existing.Id, cadetName = result.CadetName });
                }
            }

            return Conflict(new { success = false, message = result.Message });
        }

        return Ok(new { success = true, message = "Attendance recorded.", cadetName = result.CadetName, attendanceId = result.AttendanceId });
    }

    [HttpDelete("attendance/{id:int}")]
    [Authorize(Roles = "admin,officer")]
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
    public async Task<IActionResult> GetReport([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        if (start.HasValue && end.HasValue)
        {
            if (start.Value > end.Value)
            {
                return BadRequest(new { message = "Invalid date range." });
            }

            var total = await _context.AttendanceRecords
                .CountAsync(a => a.Date >= start.Value.Date && a.Date <= end.Value.Date);

            return Ok(new
            {
                weeklySummary = $"{total} attendance marks recorded between {start.Value:yyyy-MM-dd} and {end.Value:yyyy-MM-dd}.",
                pendingReview = 0,
                exportReady = total
            });
        }

        var today = DateTime.UtcNow.Date;
        var todayTotal = await _context.AttendanceRecords.CountAsync(a => a.Date == today);
        return Ok(new { weeklySummary = $"{todayTotal} attendance marks recorded today.", pendingReview = 0, exportReady = todayTotal });
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
    public string QrCodeId { get; set; } = string.Empty;
    public string OfficerName { get; set; } = string.Empty;
}
