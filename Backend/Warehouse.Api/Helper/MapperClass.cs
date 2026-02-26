using AutoMapper;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Helper
{
    public class MapperClass : Profile
    {
        public MapperClass()
        {
            // User mappings
            CreateMap<User, UserResponse>()
                .ForMember(d => d.RoleName,
                    opt => opt.MapFrom(s => s.UserRoleUser != null && s.UserRoleUser.Role != null
                        ? s.UserRoleUser.Role.RoleName
                        : null));
        }
    }
}
