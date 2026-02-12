package middlewares

import (
	"backend/pkg/response"
	"backend/pkg/utils"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, response.Error("Authorization header is required"))
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, response.Error("Authorization header format must be Bearer {token}"))
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := utils.ValidateToken(tokenString)
		if err != nil || !token.Valid {
			log.Printf("Token validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, response.Error("Invalid or expired token"))
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Println("Invalid token claims")
			c.JSON(http.StatusUnauthorized, response.Error("Invalid token claims"))
			c.Abort()
			return
		}

		log.Printf("Authenticated User ID: %v, Role: %v", claims["user_id"], claims["role"])

		c.Set("user_id", claims["user_id"])
		c.Set("role", claims["role"])
		c.Next()
	}
}

func RoleMiddleware(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, response.Error("Role not found in context"))
			c.Abort()
			return
		}

		// Handle both string and potentially slice of roles if we upgrade context later
		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusForbidden, response.Error("Invalid role type in context"))
			c.Abort()
			return
		}

		allowed := false
		for _, r := range roles {
			if r == roleStr {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, response.Error("You don't have permission to access this resource"))
			c.Abort()
			return
		}

		c.Next()
	}
}
