using Microsoft.EntityFrameworkCore;
using RotcAttendance.Api.Data;
using RotcAttendance.Api.Models;

namespace RotcAttendance.Api.Services;

public class AttendanceService
{
    private readonly RotcAttendanceDbContext _context;
    private readonly QrService _qrService;

    public AttendanceService(RotcAttendanceDbContext context, QrService qrService)
    {
        _context = context;
        _qrService = qrService;
    }

    public async Task<AttendanceResult> MarkAttendanceAsync(int cadetProfileId, string officerName)
    {
        var cadet = await _context.CadetProfiles.SingleOrDefaultAsync(c => c.Id == cadetProfileId);
        if (cadet is null)
        {
            return AttendanceResult.CreateFailure("Cadet not found.");
        }

        var attendanceDate = DateTime.UtcNow.Date;
        var exists = await _context.AttendanceRecords.AnyAsync(a => a.CadetProfileId == cadetProfileId && a.Date == attendanceDate);
        if (exists)
        {
            return AttendanceResult.CreateFailure("Attendance already recorded for this cadet today.");
        }

        var record = new AttendanceRecord
        {
            CadetProfileId = cadetProfileId,
            Date = attendanceDate,
            Status = "Present",
            Notes = $"Scanned by {officerName}",
        };

        _context.AttendanceRecords.Add(record);
        await _context.SaveChangesAsync();

        return AttendanceResult.CreateSuccess(record.Id, cadet.FullName ?? "Cadet");
    }

    public async Task<CadetQrInfo?> GenerateQrForCadetAsync(int cadetProfileId)
    {
        var cadet = await _context.CadetProfiles.FindAsync(cadetProfileId);
        if (cadet is null)
        {
            return null;
        }

        cadet.QrCodeValue = string.IsNullOrWhiteSpace(cadet.QrCodeValue) ? _qrService.GenerateUniqueValue() : cadet.QrCodeValue;
        cadet.QrCodeImageBase64 = _qrService.GeneratePngBase64(cadet.QrCodeValue);
        cadet.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new CadetQrInfo
        {
            CadetId = cadet.Id,
            FullName = cadet.FullName ?? "Cadet",
            QrCodeValue = cadet.QrCodeValue ?? string.Empty,
            QrCodeImageBase64 = cadet.QrCodeImageBase64
        };
    }

    public async Task<CadetQrInfo?> GetQrForCadetAsync(int cadetProfileId)
    {
        var cadet = await _context.CadetProfiles.FindAsync(cadetProfileId);
        if (cadet is null)
        {
            return null;
        }

        return new CadetQrInfo
        {
            CadetId = cadet.Id,
            FullName = cadet.FullName ?? "Cadet",
            QrCodeValue = cadet.QrCodeValue ?? string.Empty,
            QrCodeImageBase64 = cadet.QrCodeImageBase64
        };
    }

    public async Task<CadetQrInfo?> ResolveCadetByQrAsync(string qrValue)
    {
        var cadet = await _context.CadetProfiles.SingleOrDefaultAsync(c => c.QrCodeValue == qrValue);
        return cadet is null ? null : new CadetQrInfo
        {
            CadetId = cadet.Id,
            FullName = cadet.FullName ?? "Cadet",
            QrCodeValue = cadet.QrCodeValue ?? string.Empty,
            QrCodeImageBase64 = cadet.QrCodeImageBase64
        };
    }
}

public class AttendanceResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public int? AttendanceId { get; init; }
    public string? CadetName { get; init; }

    public static AttendanceResult CreateSuccess(int attendanceId, string cadetName) => new() { Success = true, Message = "Attendance recorded.", AttendanceId = attendanceId, CadetName = cadetName };
    public static AttendanceResult CreateFailure(string message) => new() { Success = false, Message = message };
}

public class CadetQrInfo
{
    public int CadetId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string QrCodeValue { get; set; } = string.Empty;
    public string? QrCodeImageBase64 { get; set; }
}
