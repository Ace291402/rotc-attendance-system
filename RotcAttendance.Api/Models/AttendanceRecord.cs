using System.ComponentModel.DataAnnotations;

namespace RotcAttendance.Api.Models;

public class AttendanceRecord
{
    public int Id { get; set; }

    public int CadetProfileId { get; set; }

    public DateTime Date { get; set; } = DateTime.UtcNow;

    [MaxLength(20)]
    public string Status { get; set; } = "Present";

    [MaxLength(200)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CadetProfile? CadetProfile { get; set; }
}
