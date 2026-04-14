package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes)
}

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var class models.Class
	if err := db.Where("name = ?", "XII PPLG 3").First(&class).Error; err != nil {
		fmt.Println("Error: Class XII PPLG 3 not found. Run the seed script first.")
		return
	}

	students := []struct {
		Name  string
		Email string
		NIS   string
	}{
		{"Budi Cahyadi", "budi.c@student.com", "2026001"},
		{"Ani Wijaya", "ani.w@student.com", "2026002"},
		{"Rendi Pratama", "rendi.p@student.com", "2026003"},
	}

	for _, s := range students {
		user := models.User{
			Name:     s.Name,
			Email:    s.Email,
			Password: hashPassword(s.NIS), // Password set to NIS for testing
			Role:     "murid",
			ClassID:  &class.ID,
		}
		
		if err := db.Where("email = ?", user.Email).FirstOrCreate(&user).Error; err == nil {
			db.Where(models.Profile{UserID: user.ID}).
				Assign(models.Profile{NIS: s.NIS}).
				FirstOrCreate(&models.Profile{})
			fmt.Printf("✅ Created Student: %s (Email: %s, PW: %s)\n", s.Name, s.Email, s.NIS)
		}
	}

	fmt.Println("--- Done! You can now login as one of these students to get their QR Code ---")
}
