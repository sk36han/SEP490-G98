using System;
using Microsoft.Extensions.Configuration;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.DataAcces.Service
{
    public class DateTimeProvider : IDateTimeProvider
    {
        private readonly TimeZoneInfo _businessTimeZone;
        private readonly Func<DateTime> _utcNowAccessor;

        public DateTimeProvider(IConfiguration configuration)
        {
            var timezoneId = configuration["BUSINESS_TIMEZONE"];
            _businessTimeZone = ResolveTimeZone(timezoneId);
            _utcNowAccessor = () => DateTime.UtcNow;
        }

        public DateTimeProvider(string timezoneId, Func<DateTime> utcNowAccessor)
        {
            _businessTimeZone = ResolveTimeZone(timezoneId);
            _utcNowAccessor = utcNowAccessor;
        }

        public DateTime UtcNow() => _utcNowAccessor();

        public DateTime BusinessNow()
        {
            return ToBusinessTime(UtcNow());
        }

        public DateOnly BusinessToday()
        {
            return ToBusinessDate(UtcNow());
        }

        public DateTime ToBusinessTime(DateTime utcDateTime)
        {
            var utc = utcDateTime.Kind == DateTimeKind.Utc
                ? utcDateTime
                : DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTimeFromUtc(utc, _businessTimeZone);
        }

        public DateOnly ToBusinessDate(DateTime utcDateTime)
        {
            return DateOnly.FromDateTime(ToBusinessTime(utcDateTime));
        }

        private static TimeZoneInfo ResolveTimeZone(string? timezoneId)
        {
            var requestedId = string.IsNullOrWhiteSpace(timezoneId) ? "Asia/Ho_Chi_Minh" : timezoneId.Trim();
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(requestedId);
            }
            catch (TimeZoneNotFoundException)
            {
                if (requestedId.Equals("Asia/Ho_Chi_Minh", StringComparison.OrdinalIgnoreCase))
                {
                    return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                }
                throw;
            }
        }
    }
}
