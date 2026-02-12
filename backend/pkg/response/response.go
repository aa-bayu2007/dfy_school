package response

import "backend/models"

func Success(data interface{}) models.Response {
	return models.Response{Status: "success", Message: "Operation successful", Data: data}
}

func Error(message string) models.Response {
	return models.Response{Status: "error", Message: message}
}