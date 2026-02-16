package config

import (
	"backend/models"
	"fmt"
	"golang.org/x/crypto/bcrypt"
	"log"
	"strings"

	"github.com/xuri/excelize/v2"
)


func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes)
}

func SeedData() {
	db := GetDB()

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
		{ID: 6, Name: "Sabtu"},
		{ID: 7, Name: "Minggu"},
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
		{SlotNumber: 7, StartTime: "12:30", EndTime: "13:15"},
		{SlotNumber: 8, StartTime: "13:15", EndTime: "14:00"},
		{SlotNumber: 9, StartTime: "14:00", EndTime: "14:45"},
		{SlotNumber: 10, StartTime: "14:45", EndTime: "15:30"},
	}
	for _, slot := range slots {
		db.FirstOrCreate(&slot, models.TimeSlot{SlotNumber: slot.SlotNumber})
	}

	// Seed Classes
	classes := []models.Class{
		{Name: "X PPLG 1", Grade: "X"},
		{Name: "X PPLG 2", Grade: "X"},
		{Name: "XI PPLG 1", Grade: "XI"},
		{Name: "XI PPLG 2", Grade: "XI"},
		{Name: "XII PPLG 1", Grade: "XII"},
		{Name: "XII PPLG 2", Grade: "XII"},
	}
	for i := range classes {
		db.FirstOrCreate(&classes[i], models.Class{Name: classes[i].Name})
	}

	// Seed Users (Admin & Guru)
	admin := models.User{
		Name:     "Super Admin",
		Email:    "admin@school.com",
		Password: hashPassword("password"),
		Role:     "admin",
	}
	db.FirstOrCreate(&admin, models.User{Email: admin.Email})
	db.FirstOrCreate(&models.Profile{UserID: admin.ID, NIP: "ADMIN001"}, models.Profile{UserID: admin.ID})

	guru := models.User{
		Name:     "Budi Santoso",
		Email:    "budi@school.com",
		Password: hashPassword("password"),
		Role:     "guru",
	}
	db.FirstOrCreate(&guru, models.User{Email: guru.Email})
	db.FirstOrCreate(&models.Profile{UserID: guru.ID, NIP: "198501012010011001"}, models.Profile{UserID: guru.ID})

	// Seed Subjects (Now with TeacherID)
	subjectsSeed := []models.Subject{
		{Name: "Pemrograman Perangkat Lunak", Code: "PPL", TeacherID: &guru.ID},
		{Name: "Basis Data", Code: "BD", TeacherID: &guru.ID},
		{Name: "Matematika", Code: "MTK", TeacherID: &guru.ID},
	}
	for i := range subjectsSeed {
		db.FirstOrCreate(&subjectsSeed[i], models.Subject{Name: subjectsSeed[i].Name})
	}

	// Get class IDs for students
	var classX1, classX2, classXI1, classXI2, classXII1, classXII2 models.Class
	db.Where("name = ?", "X PPLG 1").First(&classX1)
	db.Where("name = ?", "X PPLG 2").First(&classX2)
	db.Where("name = ?", "XI PPLG 1").First(&classXI1)
	db.Where("name = ?", "XI PPLG 2").First(&classXI2)
	db.Where("name = ?", "XII PPLG 1").First(&classXII1)
	db.Where("name = ?", "XII PPLG 2").First(&classXII2)

	f, err := excelize.OpenFile("data/siswa.xlsx")
	if err != nil {
		log.Fatalf("Gagal buka file excel: %v", err)
	}

	sheetName := f.GetSheetName(0)

	rows, err := f.GetRows(sheetName)
	if err != nil {
		log.Fatalf("Gagal baca sheet: %v", err)
	}

	for i, row := range rows {

		// Skip header
		if i == 0 {
			continue
		}

		if len(row) < 3 {
			continue
		}

		nis := strings.TrimSpace(row[1])
		nama := strings.TrimSpace(row[2])

		if nis == "" || nama == "" {
			continue
		}

		email := nis + "@student.com"

		var user models.User
		err := db.Where("email = ?", email).First(&user).Error

		if err != nil {
			user = models.User{
				Name:     nama,
				Email:    email,
				Password: hashPassword(nis), // 🔥 Password = NIS
				Role:     "murid",
				ClassID:  &classXII1.ID,
			}
			db.Create(&user)
		}

		var profile models.Profile
		if err := db.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
			profile = models.Profile{
				UserID: user.ID,
				NIS:    nis,
			}
			db.Create(&profile)
		}
	}

	// Seed Students for X PPLG 1
	studentsX1 := []models.User{
		{Name: "Bagus X", Email: "bagus@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classX1.ID},
		{Name: "Chandra X", Email: "chandra@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classX1.ID},
	}
	for i := range studentsX1 {
		db.FirstOrCreate(&studentsX1[i], models.User{Email: studentsX1[i].Email})
		db.FirstOrCreate(&models.Profile{UserID: studentsX1[i].ID, NIS: fmt.Sprintf("2024100%d", i+1)}, models.Profile{UserID: studentsX1[i].ID})
	}

	// Seed Students for XI PPLG 1
	studentsXI1 := []models.User{
		{Name: "Dedi XI", Email: "dedi@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classXI1.ID},
		{Name: "Erlangga XI", Email: "erlangga@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classXI1.ID},
	}
	for i := range studentsXI1 {
		db.FirstOrCreate(&studentsXI1[i], models.User{Email: studentsXI1[i].Email})
		db.FirstOrCreate(&models.Profile{UserID: studentsXI1[i].ID, NIS: fmt.Sprintf("2024110%d", i+1)}, models.Profile{UserID: studentsXI1[i].ID})
	}

	// Seed Students for XII PPLG 1
	studentsXII1 := []models.User{
		{Name: "Ahmad Ketua", Email: "ahmad@student.com", Password: hashPassword("password"), Role: "ketua_kelas", ClassID: &classXII1.ID},
		{Name: "Siti Aminah", Email: "siti@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classXII1.ID},
	}
	for i := range studentsXII1 {
		db.FirstOrCreate(&studentsXII1[i], models.User{Email: studentsXII1[i].Email})
		db.FirstOrCreate(&models.Profile{UserID: studentsXII1[i].ID, NIS: fmt.Sprintf("2024120%d", i+1)}, models.Profile{UserID: studentsXII1[i].ID})
	}

	// Seed Students for XII PPLG 2
	studentsXII2 := []models.User{
		{Name: "Dina Marlina", Email: "dina@student.com", Password: hashPassword("password"), Role: "ketua_kelas", ClassID: &classXII2.ID},
		{Name: "Eko Prasetyo", Email: "eko@student.com", Password: hashPassword("password"), Role: "murid", ClassID: &classXII2.ID},
	}
	for i := range studentsXII2 {
		db.FirstOrCreate(&studentsXII2[i], models.User{Email: studentsXII2[i].Email})
		db.FirstOrCreate(&models.Profile{UserID: studentsXII2[i].ID, NIS: fmt.Sprintf("2024220%d", i+1)}, models.Profile{UserID: studentsXII2[i].ID})
	}

	// Seed Schedules for the Week (Day 1-5)
	var pplMapel, bdMapel, mtkMapel models.Subject
	db.Where("code = ?", "PPL").First(&pplMapel)
	db.Where("code = ?", "BD").First(&bdMapel)
	db.Where("code = ?", "MTK").First(&mtkMapel)

	var allSlots []models.TimeSlot
	db.Order("slot_number ASC").Find(&allSlots)

	classes_list := []models.Class{classX1, classX2, classXI1, classXI2, classXII1, classXII2}
	subjects_list := []models.Subject{pplMapel, bdMapel, mtkMapel}

	fmt.Println("   Generating schedules for 5 days...")
	scheduleCount := 0
	for day := 1; day <= 5; day++ {
		for _, cls := range classes_list {
			// Each class has 3 slots per day for demo
			for i := 0; i < 3; i++ {
				if i >= len(allSlots) {
					continue
				}
				subj := subjects_list[(day+int(cls.ID)+i)%len(subjects_list)]
				sch := models.Schedule{
					DayID:      day,
					TimeSlotID: allSlots[i].ID,
					SubjectID:  subj.ID,
					ClassID:    cls.ID,
					TeacherID:  &guru.ID,
				}
				db.FirstOrCreate(&sch, models.Schedule{
					ClassID:    sch.ClassID,
					DayID:      sch.DayID,
					TimeSlotID: sch.TimeSlotID,
				})
				scheduleCount++
			}
		}
	}
	log.Printf("Seeded %d schedules", scheduleCount)

	log.Println("Seeding completed!")
	log.Println("Sample accounts created:")
	log.Println("  Admin: admin@school.com / password")
	log.Println("  Guru: budi@school.com / password")
	log.Println("  Ketua Kelas PPLG 1: ahmad@student.com / password")
	log.Println("  Ketua Kelas PPLG 2: dina@student.com / password")
	log.Println("  Murid: siti@student.com / password (and others)")
	log.Println("Seed Excel siswa XII PPLG 1 selesai")
}
