using System.ComponentModel.DataAnnotations;

namespace RotcAttendance.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "cadet";

    [MaxLength(150)]
    public string? Name { get; set; }

    [MaxLength(100)]
    public string? Platoon { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CadetProfile? CadetProfile { get; set; }
}
