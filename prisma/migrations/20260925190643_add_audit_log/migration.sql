-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "table_name" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "row_data" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL DEFAULT current_user,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- Função genérica de auditoria: regista a linha afetada (NEW em INSERT/UPDATE, OLD em DELETE).
CREATE OR REPLACE FUNCTION log_changes() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_log(table_name, operation, row_data)
  VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(COALESCE(NEW, OLD)));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Os nomes das tabelas do Prisma são case-sensitive, por isso vão entre aspas.
-- Para auditar outra tabela, repetir este bloco com o nome dela.
CREATE TRIGGER nota_audit
AFTER INSERT OR UPDATE OR DELETE ON "Nota"
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER instrumento_audit
AFTER INSERT OR UPDATE OR DELETE ON "Instrumento"
FOR EACH ROW EXECUTE FUNCTION log_changes();
