package config

import (
	"backend/models"
	"log"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes)
}

func SeedData() {
	db := GetDB()

	log.Println("🌱 Starting database seeding...")

	// Debug: Print current working directory
	if cwd, err := os.Getwd(); err == nil {
		log.Println("Current working directory:", cwd)
	}
	// Debug: Check if excel file exists
	if _, err := os.Stat("data/siswa.xlsx"); os.IsNotExist(err) {
		log.Println("⚠️ data/siswa.xlsx NOT FOUND in current directory!")
	} else {
		log.Println("✅ data/siswa.xlsx found!")
	}

	// Seed Permissions
	permissions := []models.Permission{
		{Name: "Manage Users", Slug: "users.manage"},
		{Name: "Scan QR", Slug: "attendance.scan"},
		{Name: "Request Attendance", Slug: "attendance.request"},
		{Name: "View Recap", Slug: "attendance.recap"},
	}
	for _, p := range permissions {
		db.FirstOrCreate(&p, models.Permission{Slug: p.Slug})
	}

	// Seed Roles
	var pScan, pReq, pRecap models.Permission
	db.Where("slug = ?", "attendance.scan").First(&pScan)
	db.Where("slug = ?", "attendance.request").First(&pReq)
	db.Where("slug = ?", "attendance.recap").First(&pRecap)

	roles := []models.Role{
		{Name: "admin"},
		{Name: "guru", Permissions: []models.Permission{pRecap}},
		{Name: "ketua_kelas", Permissions: []models.Permission{pScan, pRecap}},
		{Name: "murid", Permissions: []models.Permission{pReq}},
	}
	for _, r := range roles {
		db.FirstOrCreate(&r, models.Role{Name: r.Name})
	}

	// Seed Days
	days := []models.Day{
		{ID: 1, Name: "Senin"},
		{ID: 2, Name: "Selasa"},
		{ID: 3, Name: "Rabu"},
		{ID: 4, Name: "Kamis"},
		{ID: 5, Name: "Jumat"},
	}
	for _, day := range days {
		db.FirstOrCreate(&day, models.Day{ID: day.ID})
	}

	// Seed TimeSlots
	slots := []models.TimeSlot{
		{SlotNumber: 1, StartTime: "07:00", EndTime: "07:45"},
		{SlotNumber: 2, StartTime: "07:45", EndTime: "08:30"},
		{SlotNumber: 3, StartTime: "08:30", EndTime: "09:15"},
		{SlotNumber: 4, StartTime: "09:30", EndTime: "10:15"},
		{SlotNumber: 5, StartTime: "10:15", EndTime: "11:00"},
		{SlotNumber: 6, StartTime: "11:00", EndTime: "11:45"},
	}
	for _, slot := range slots {
		db.FirstOrCreate(&slot, models.TimeSlot{SlotNumber: slot.SlotNumber})
	}

	// Seed Classes (Correctly structured)
	classes := []models.Class{
		{Name: "X PPLG 1", Grade: "X", Major: "PPLG", Section: "1"},
		{Name: "X PPLG 2", Grade: "X", Major: "PPLG", Section: "2"},
		{Name: "XI PPLG 1", Grade: "XI", Major: "PPLG", Section: "1"},
		{Name: "XII PPLG 1", Grade: "XII", Major: "PPLG", Section: "1"},
	}
	for i := range classes {
		db.FirstOrCreate(&classes[i], models.Class{Name: classes[i].Name})
	}

	// Seed Admin
	admin := models.User{
		Name:     "Super Admin",
		Email:    "admin@school.com",
		Password: hashPassword("password"),
		Role:     "admin",
	}
	db.FirstOrCreate(&admin, models.User{Email: admin.Email})
	db.FirstOrCreate(&models.Profile{UserID: admin.ID, NIP: "ADMIN001"}, models.Profile{UserID: admin.ID})

	// Seed Guru (Budi Santoso)
	guru := models.User{
		Name:     "Budi Santoso",
		Email:    "budi@school.com",
		Password: hashPassword("password"),
		Role:     "guru",
	}
	db.FirstOrCreate(&guru, models.User{Email: guru.Email})
	db.Where(models.Profile{UserID: guru.ID}).
		Assign(models.Profile{NIP: "123456"}).
		FirstOrCreate(&models.Profile{})

	// ⭐️ CRITICAL: Assign Budi Santoso as Wali Kelas for XII PPLG 1 ⭐️
	db.Model(&models.Class{}).Where("name = ?", "XII PPLG 1").Update("teacher_id", guru.ID)

	// Seed Subjects
	subjects := []models.Subject{
		{Name: "Pemrograman Web", Code: "WEB", TeacherID: &guru.ID},
		{Name: "Basis Data", Code: "DB", TeacherID: &guru.ID},
	}
	for i := range subjects {
		db.FirstOrCreate(&subjects[i], models.Subject{Code: subjects[i].Code})
	}

	// Seed Students (Try Excel First)
	studentCount := 0
	var xiiPplg1 models.Class
	db.Where("name = ?", "XII PPLG 1").First(&xiiPplg1)

	f, err := excelize.OpenFile("data/siswa.xlsx")
	if err == nil {
		defer f.Close()
		rows, _ := f.GetRows(f.GetSheetName(0))
		for i, row := range rows {
			if i == 0 || len(row) < 3 {
				continue
			}
			nis := strings.TrimSpace(row[1])
			nama := strings.TrimSpace(row[2])
			if nis == "" || nama == "" {
				continue
			}

			user := models.User{
				Name: nama, Email: nis + "@student.com", Password: hashPassword(nis),
				Role: "murid", ClassID: &xiiPplg1.ID,
			}
			if db.FirstOrCreate(&user, models.User{Email: user.Email}).Error == nil {
				db.FirstOrCreate(&models.Profile{UserID: user.ID, NIS: nis}, models.Profile{UserID: user.ID})
				studentCount++
			}
		}
		log.Printf("Seeded %d students from Excel", studentCount)
	} else {
		log.Printf("⚠️  Excel failed (%v), seeding mock students for XII PPLG 1", err)
		mockStudents := []struct{ Name, NIS string }{
			{"Ahmad Fauzi", "2024001"},
			{"Siti Rohmah", "2024002"},
			{"Budi Pratama", "2024003"},
		}
		for _, s := range mockStudents {
			user := models.User{
				Name: s.Name, Email: s.NIS + "@student.com", Password: hashPassword("password"),
				Role: "murid", ClassID: &xiiPplg1.ID,
			}
			db.FirstOrCreate(&user, models.User{Email: user.Email})
			db.FirstOrCreate(&models.Profile{UserID: user.ID, NIS: s.NIS}, models.Profile{UserID: user.ID})
			studentCount++
		}
	}

	// Seed Schedules
	var webMapel models.Subject
	db.Where("code = ?", "WEB").First(&webMapel)
	var slot1 models.TimeSlot
	db.Where("slot_number = ?", 1).First(&slot1)

	for d := 1; d <= 5; d++ {
		sch := models.Schedule{
			DayID: d, TimeSlotID: slot1.ID, SubjectID: webMapel.ID, ClassID: xiiPplg1.ID, TeacherID: &guru.ID,
		}
		db.FirstOrCreate(&sch, models.Schedule{DayID: d, TimeSlotID: slot1.ID, ClassID: xiiPplg1.ID})
	}

	log.Println("✅ Seeding completed successfully!")
}
